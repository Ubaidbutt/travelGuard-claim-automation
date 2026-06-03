# Backend — TravelGuard Claims API

FastAPI backend that receives claim submissions, runs an AI adjudication pipeline, and persists decisions. Python 3.12, uv package manager.

---

## Setup

```bash
uv sync
cp .env.example .env   # then fill in values
uv run fastapi dev main.py   # dev server with hot reload → http://localhost:8000
```

Interactive API docs at `http://localhost:8000/docs`.

### Environment variables (`backend/.env`)

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | yes | Service role key — bypasses RLS |
| `ANTHROPIC_API_KEY` | yes | `sk-ant-...` |
| `CLAUDE_MODEL` | no | Default: `claude-sonnet-4-6` — used for Pass 2 (policy adjudicator) |
| `CLAUDE_EVIDENCE_MODEL` | no | Default: `claude-haiku-4-5-20251001` — used for Pass 1 (evidence analyst) |
| `CONFIDENCE_APPROVE` | no | Default: `0.80` — LLM confidence ≥ this → approved |
| `CONFIDENCE_REJECT` | no | Default: `0.50` — below this → rejected; between → needs_more_info |
| `ENVIRONMENT` | no | `development` (allows all CORS) or `production` |
| `FRONTEND_URL` | no | Default: `http://localhost:3000` — CORS origin in production |

All settings are in `config.py` via `pydantic-settings`. Import `from config import settings` anywhere.

---

## API endpoints

### `POST /claims` → 201
Creates a case row (status `pending`), kicks off `pipeline_service.process()` as a FastAPI `BackgroundTask`, and returns immediately.

```json
{ "claim_id": "CLM-A3F9K2X8", "status": "pending" }
```

Processing takes 10–30 seconds. The caller polls `GET /claims/{id}`.

### `GET /claims/{claim_id}` → 200 / 404
Returns current case status.

```json
{
  "claim_id": "CLM-A3F9K2X8",
  "status": "approved",
  "decision_summary": "...",
  "approved_amount": 1700.00,
  "created_at": "2026-05-30T10:30:00Z",
  "updated_at": "2026-05-30T10:30:22Z"
}
```

Status values: `pending` `processing` `approved` `rejected` `needs_more_info` `failed`

### `POST /claims/validate-policy` → 200 / 404 / 422
Validates policy number + email + date of birth match the mock insurer's records. Used by step 1 of the claim form before the claimant proceeds.

### `GET /health` → 200
Returns `{"status": "ok"}`. No auth required.

---

## Project structure

```
backend/
├── main.py                    FastAPI app, CORS, router registration
├── config.py                  pydantic-settings Settings class
├── pyproject.toml             uv dependencies
├── adapters/
│   ├── base.py                InsurerAdapter abstract base class
│   ├── router.py              Adapter registry: get_adapter("nn_travel")
│   ├── mock_nn_travel.py      MockNNTravelAdapter + get_mock_wording()
│   ├── mock_policies.json     10 hardcoded policy profiles
│   └── master_policy.pdf      Full policy wording PDF
├── engine/
│   ├── model.py               analyse_evidence() [Pass 1] + assess_claim() [Pass 2]
│   ├── rule_engine.py         pre_check() + post_check()
│   └── prompts/
│       ├── evidence_analyst_system_prompt.txt      Pass 1 — document extraction role
│       └── claim_assessment_system_prompt.txt      Pass 2 — policy adjudication role
├── scripts/
│   └── upload_demo_docs.py    Generates 8 demo PDFs via fpdf2 and uploads to Supabase Storage
│                              Run once: uv run python scripts/upload_demo_docs.py
├── models/
│   ├── claim.py               ClaimCreateRequest, ClaimCase, ClaimStatusResponse
│   ├── policy.py              PolicySchedule, PolicyWording, CoverageLimit
│   └── decision.py            ClaimDecision (LLM tool output schema)
├── routers/
│   └── claims.py              Route handlers — thin, delegates to services
├── services/
│   ├── claim_service.py       create(), get_by_claim_id(), get_full_by_id(), update_decision()
│   └── pipeline_service.py    process() — full pipeline orchestration
└── db/
    └── client.py              Supabase client singleton: get_db()
```

---

## Pipeline flow (`services/pipeline_service.py`)

Called as a background task after claim creation. Each step in order:

```
1. Mark status = "processing" in DB (immediately, before any work)
2. Fetch full ClaimCase from DB → model_validate into typed model
3. get_adapter("nn_travel").fetch(policy_number) → PolicySchedule
4. get_mock_wording() → PolicyWording (PDF extracted text, cached in memory)
5. rule_engine.pre_check(case, policy_schedule)
   → If violation: update DB (status=rejected, summary=violation.reason), return
6. engine.model.analyse_evidence(schedule, case) → EvidenceReport   [Pass 1 — Haiku]
   → Insert row into claim_llm_passes (pass1_* columns)
7. engine.model.assess_claim(wording, schedule, case, evidence) → ClaimDecision   [Pass 2 — Sonnet]
   → Update claim_llm_passes row (pass2_* columns)
8. rule_engine.post_check(decision, policy_schedule) → ClaimDecision (modified)
9. update_decision(db, case_id, status, summary, approved_amount, assessment_detail)

Errors:
  PolicyNotFoundError → status=rejected
  LLMAssessmentError  → status=failed (pass1 row may exist in claim_llm_passes if Pass 1 succeeded)
  Any other Exception → status=failed (and re-raised)
```

---

## Rule engine (`engine/rule_engine.py`)

### Pre-checks (run before LLM — saves token cost on clear rejections)

| Rule name | Check |
|---|---|
| `expired_policy` | `policy.status == "active"` |
| `outside_filing_window` | `(today - case.cancellation_date).days <= 90` |
| `foreseeable_event` | `case.aware_of_reason_date >= policy.purchase_date` |
| `net_claim_zero` | `case.total_cost - case.already_refunded > 0` |

Returns `RuleViolation(rule, reason)` or `None`.

### Post-checks (run after LLM — enforce hard constraints)

1. **Confidence thresholds** (from `config.py`, same values injected into system prompt):
   - `confidence >= CONFIDENCE_APPROVE (0.80)` → force `decision = "approved"`
   - `confidence < CONFIDENCE_REJECT (0.50)` → force `decision = "rejected"`, clear `approved_amount`
   - Otherwise → force `decision = "needs_more_info"`, clear `approved_amount`
   - If overridden: logs warning, replaces user-facing summary with a generic message

2. **Coverage cap**: if approved, clamp `approved_amount` to the policy's `trip_cancellation` limit.

---

## LLM integration (`engine/model.py`)

Two async functions forming a sequential two-pass pipeline.

---

### Pass 1 — `analyse_evidence(policy_schedule, case) → tuple[EvidenceReport, dict]`

**Model:** `claude-haiku-4-5-20251001` (configurable via `CLAUDE_EVIDENCE_MODEL`)
**Purpose:** Extract and structure all evidence from uploaded documents. Does not access policy wording or make coverage decisions.
**Output:** `EvidenceReport` via `tool_choice={"type":"tool","name":"submit_evidence_report"}`
**Also returns:** `usage` dict with `input_tokens`, `output_tokens`, `cache_read_tokens`

| # | Block | Cached? | Content |
|---|---|---|---|
| sys | Evidence analyst prompt | Yes (ephemeral) | Extraction role, expected-doc mapping by reason, fraud signals, quality rubric |
| 1 | Policy schedule | No | Holder identity + coverage dates — for cross-referencing against documents |
| 2 | Claim form data | No | Dates, costs, reason, description — user text wrapped in XML tags |
| 3 | Documents | No | Each file as `image` or `document` block by Supabase Storage URL |
| 4 | Final instruction | No | "Extract facts and produce your evidence report" |

---

### Pass 2 — `assess_claim(policy_wording, policy_schedule, case, evidence) → tuple[ClaimDecision, dict]`

**Model:** `claude-sonnet-4-6` (configurable via `CLAUDE_MODEL`)
**Purpose:** Apply policy wording to the structured evidence report and produce a coverage decision.
**Output:** `ClaimDecision` via `tool_choice={"type":"tool","name":"submit_claim_decision"}`
**Also returns:** `usage` dict with `input_tokens`, `output_tokens`, `cache_read_tokens`

| # | Block | Cached? | Content |
|---|---|---|---|
| sys | Adjudicator prompt | Yes (ephemeral) | Policy interpretation role, evidence quality guidance, confidence table |
| 1 | Policy wording | Yes (ephemeral) | Full extracted PDF text — no volatile document URLs follow it, improving cache hit rate |
| 2 | Policy schedule | No | Per-customer: limits, dates, deductibles, claim history |
| 3 | Claim form data | No | Dates, costs, description — user text wrapped in XML tags |
| 4 | Evidence Report | No | Structured output from Pass 1: quality rating, discrepancies, fraud signals, narrative |
| 5 | Final instruction | No | "Apply policy to the evidence above" |

---

### Confidence thresholds in system prompt

The values from `config.py` are injected into the Pass 2 prompt at startup:
```python
template.format(approve_threshold="0.80", reject_threshold="0.50", approve_pct=80)
```
This keeps the prompt and the `post_check()` enforcement always in sync.

### Prompt injection protection

Free-text user fields are wrapped in XML tags in both passes:
- `<claimant_name>`, `<booking_reference>`, `<claimant_description>`

Structured fields (dates, costs) bypass the LLM entirely — validated by the rule engine from typed Python values.

### Response parsing

```python
tool_block = next(b for b in response.content if b.type == "tool_use")
return EvidenceReport.model_validate(tool_block.input), usage   # Pass 1
return ClaimDecision.model_validate(tool_block.input), usage    # Pass 2
```

Pydantic validates directly. Any failure raises `LLMAssessmentError`.

---

## Models

### `EvidenceReport` (Pass 1 output — `models/decision.py`)

```python
class EvidenceReport(BaseModel):
    document_extractions: list[DocumentExtraction]
    cross_document_discrepancies: list[str]
    missing_expected_documents: list[str]
    fraud_signals: list[str]
    evidence_quality: Literal["strong", "adequate", "weak", "insufficient"]
    evidence_narrative: str
```

### `ClaimDecision` (Pass 2 output — `models/decision.py`)

```python
class DocumentExtraction(BaseModel):
    document_type: str
    extracted_facts: dict[str, str]
    matches_form_data: bool
    discrepancies: list[str]

class PolicyComplianceCheck(BaseModel):
    reason_is_covered: bool
    evidence_sufficient: bool
    policy_conditions_met: bool
    compliance_notes: str

class ClaimDecision(BaseModel):
    document_extractions: list[DocumentExtraction]  # populated from EvidenceReport by pipeline
    policy_compliance: PolicyComplianceCheck
    decision: Literal["approved", "rejected", "needs_more_info"]
    confidence: float          # 0.0–1.0 probability of approval
    approved_amount: float | None
    summary: str               # 2-3 sentence claimant-facing text
    full_reasoning: str        # detailed internal reasoning chain
```

### `ClaimCreateRequest` valid enum values (`models/claim.py`)

`cancellation_reason`: `illness_claimant` `illness_family` `death_family` `natural_disaster` `carrier_bankruptcy` `home_uninhabitable` `jury_duty` `job_loss` `travel_advisory`

`document_type`: `booking_confirmation` `payment_proof` `physician_statement` `death_certificate` `redundancy_letter` `official_report` `travel_advisory_copy` `cancellation_proof` `other`

---

## Adapter pattern (`adapters/`)

Each insurer is a class that extends `InsurerAdapter` (`adapters/base.py`) and implements one method:

```python
async def fetch(self, policy_number: str) -> PolicySchedule: ...
```

Register adapters in `adapters/router.py`:
```python
_REGISTRY = {"nn_travel": MockNNTravelAdapter()}
def get_adapter(insurer_id: str) -> InsurerAdapter: ...
```

To add a new insurer: create a new file in `adapters/`, implement `InsurerAdapter`, register it. The pipeline never changes.

### Mock adapter (`adapters/mock_nn_travel.py`)

- Reads from `adapters/mock_policies.json` (10 hardcoded profiles)
- `get_mock_wording()` extracts and memory-caches the master policy PDF via `pypdf`
- `PolicyNotFoundError` raised for unknown policy numbers → pipeline marks claim rejected

---

## `assessment_detail` JSONB structure

Written to `claim_case.assessment_detail` for every LLM-processed claim:

```json
{
  "evidence_report": {
    "document_extractions": [...],
    "cross_document_discrepancies": [],
    "missing_expected_documents": [],
    "fraud_signals": [],
    "evidence_quality": "strong",
    "evidence_narrative": "..."
  },
  "document_extractions": [
    {
      "document_type": "physician_statement",
      "extracted_facts": {"diagnosis": "...", "admission_date": "..."},
      "matches_form_data": true,
      "discrepancies": []
    }
  ],
  "policy_compliance": {
    "reason_is_covered": true,
    "evidence_sufficient": true,
    "policy_conditions_met": true,
    "compliance_notes": "Policy Section 3.1 covers..."
  },
  "full_reasoning": "...",
  "confidence": 0.92
}
```

`evidence_report` is the full `EvidenceReport` from Pass 1. `document_extractions` duplicates `evidence_report.document_extractions` at the top level for backwards compatibility. `assessment_detail` is NOT returned by the status endpoint (`ClaimStatusResponse`) — only `decision_summary` and `approved_amount` are surfaced to the frontend.

The full Pass 1 and Pass 2 outputs (including token usage) are also stored separately in `claim_llm_passes` — one row per claim, written immediately after each pass completes.
