# TravelGuard — AI Claims Adjudication

An AI-powered travel insurance claims processing platform. Claimants submit a trip cancellation claim through a guided web form. The system retrieves their policy, runs deterministic eligibility rules, then runs a two-pass AI pipeline: a first model extracts and structures evidence from the uploaded documents, and a second model applies the policy wording to that structured evidence to produce a decision — approved, rejected, or needs review — typically in under 60 seconds.

This is a fully working end-to-end proof of concept. Scope is deliberate: one claim type (trip cancellation), one mocked insurer (NN Travel), minimal frontend. The AI layer gets the engineering attention it deserves before the integration layer is expanded.

---

## Repository structure

```
claim-automation/
├── backend/      FastAPI + Python pipeline — see backend/CLAUDE.md
└── frontend/     Next.js 16 web app — see frontend/CLAUDE.md
```

Each subdirectory has its own CLAUDE.md with layer-specific guidance.

---

## Architecture

```
Browser
  │
  ▼
Next.js 16 Frontend (Vercel)
  ├── /             Landing page
  ├── /demo         Live demo — 4 pre-built profiles, real pipeline, step-by-step visualisation
  ├── /submit       4-step claim form + Supabase Storage uploads
  └── /status       Claim reference lookup + live status polling
  │
  ▼ REST
FastAPI Backend (Railway)
  ├── POST /claims          Creates case → background pipeline → returns claim_id
  ├── GET  /claims/{id}     Current status, decision summary, approved amount
  └── POST /claims/validate-policy   Step-1 policy lookup + holder verification
  │
  ▼ BackgroundTask (~15–40s)
Pipeline service
  ├── 1. Fetch full case from DB
  ├── 2. MockNNTravelAdapter.fetch()      → PolicySchedule
  ├── 3. get_mock_wording()               → PolicyWording (cached PDF text)
  ├── 4. rule_engine.pre_check()          → hard reject if ineligible (no LLM call)
  ├── 5. engine.model.analyse_evidence()  → EvidenceReport  (Pass 1 — Haiku)
  ├── 6. engine.model.assess_claim()      → ClaimDecision   (Pass 2 — Sonnet)
  ├── 7. rule_engine.post_check()         → confidence thresholds + coverage cap
  └── 8. update_decision()                → writes status, summary, amount, audit JSONB
  │
  ▼
Supabase (Postgres + Storage)
  ├── claim_case table        All case data, decision, full audit JSONB
  ├── claim_llm_passes table  Per-claim record of both LLM pass outputs + token usage
  └── claim-documents bucket  Uploaded proof files (public read)
```

---

## Running locally

### Prerequisites
- Python 3.12+, `uv` ([install](https://docs.astral.sh/uv/getting-started/installation/))
- Node.js 20+, npm
- Supabase project with `claim_case` table and `claim-documents` storage bucket
- Anthropic API key

### Backend

```bash
cd backend
uv sync
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY
uv run fastapi dev main.py
# → http://localhost:8000  (docs: /docs)
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_*
npm run dev
# → http://localhost:3000
```

Both must be running for the full flow to work. The claim form (`/submit`) and status page (`/status`) require the backend.

---

## Database schema

Two tables. `claim_case` holds all claim data and the final decision. `claim_llm_passes` holds the full output of both AI passes for every claim, linked by `claim_id`.

```sql
CREATE TABLE claim_case (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id             TEXT          NOT NULL UNIQUE,  -- e.g. CLM-A3F9K2X8
  full_name            TEXT          NOT NULL,
  email                TEXT          NOT NULL,
  phone                TEXT          NOT NULL,
  policy_number        TEXT          NOT NULL,
  departure_date       DATE          NOT NULL,
  return_date          DATE          NOT NULL,
  destination_country  TEXT          NOT NULL,
  booking_reference    TEXT          NOT NULL,
  cancellation_reason  TEXT          NOT NULL,
  cancellation_date    DATE          NOT NULL,
  aware_of_reason_date DATE          NOT NULL,
  total_cost           NUMERIC(10,2) NOT NULL,
  already_refunded     NUMERIC(10,2) NOT NULL DEFAULT 0,
  description          TEXT          NOT NULL,
  attachments          JSONB[]       NOT NULL DEFAULT '{}',
  status               TEXT          NOT NULL DEFAULT 'pending',
  decision_summary     TEXT,
  approved_amount      NUMERIC(10,2),
  assessment_detail    JSONB,        -- full LLM audit: evidence_report, compliance, reasoning, confidence
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_claim_case_claim_id ON claim_case(claim_id);

CREATE TABLE claim_llm_passes (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id                 TEXT         NOT NULL UNIQUE REFERENCES claim_case(claim_id),

  -- Pass 1 — Evidence Analyst (claude-haiku-4-5-20251001)
  pass1_model              TEXT,
  pass1_output             JSONB,        -- full EvidenceReport
  pass1_input_tokens       INT,
  pass1_output_tokens      INT,
  pass1_cache_read_tokens  INT,

  -- Pass 2 — Policy Adjudicator (claude-sonnet-4-6)
  pass2_model              TEXT,
  pass2_output             JSONB,        -- full ClaimDecision
  pass2_input_tokens       INT,
  pass2_output_tokens      INT,
  pass2_cache_read_tokens  INT,

  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

Status lifecycle: `pending` → `processing` → `approved` | `rejected` | `needs_more_info` | `failed`

`claim_llm_passes` is written in two steps: Pass 1 output is inserted immediately after evidence analysis completes (so it is preserved even if Pass 2 fails), then Pass 2 columns are updated once adjudication finishes.

---

## Mock policy numbers (for testing)

| Policy | Holder | Tier | Status | Trip cancel limit | Notes |
|---|---|---|---|---|---|
| `POL-7823419` | Sarah Müller | Premium | Active | €5,000 | Clean history — approvals; €0 deductible |
| `POL-3156082` | Jan de Vries | Basic | **Expired** | €2,000 | Triggers instant rule rejection |
| `POL-9047253` | Amira Hassan | Classic | Active | €5,000 | 2 claims last 12 months |
| `POL-4512896` | Pieter van Dam | Basic | Active | €1,500 | €250 deductible |
| `POL-6734120` | Isabelle Fontaine | Premium | Active | €15,000 | High limit, clean history |
| `POL-8293047` | Nikolai Petrov | Premium | Active | €15,000 | + adventure sports + rental car |
| `POL-1564783` | Yuki Tanaka | Classic | Active | €5,000 | + rental car, some prior history |
| `POL-5981624` | Marco Esposito | Classic | **Suspended** | €5,000 | Triggers instant rule rejection |
| `POL-2748391` | Fatima Al-Rashidi | Premium | Active | €15,000 | + adventure sports + business equipment |
| `POL-4163057` | Lena Bergström | Basic | Active | €1,500 | Young holder, clean history |

---

## Key design decisions

**Direct Anthropic SDK, not LangChain.** Two focused Claude calls, typed Pydantic responses, deterministic rule checks. Every step is readable Python.

**Two-pass AI pipeline.** Evidence extraction and policy adjudication are separate LLM calls with separate system prompts. Pass 1 (Haiku) reads raw documents and produces a structured `EvidenceReport`. Pass 2 (Sonnet) receives that report and applies the policy wording to reach a decision. Separating these tasks means each model has a focused job, improves accuracy on complex claims, and makes failures easier to diagnose.

**Model split by cognitive load.** Pass 1 is extraction and cross-referencing — well within Haiku's capability and faster. Pass 2 is legal interpretation under uncertainty — benefits from Sonnet's stronger reasoning. Both models are independently configurable via `CLAUDE_EVIDENCE_MODEL` and `CLAUDE_MODEL` in the environment.

**Policy wording as source of truth.** Pass 2 receives the actual policy PDF text — not a pre-extracted rule list. Coverage decisions reflect precise legal wording, not a hardcoded lookup.

**Rule engine separated from LLM.** Hard facts (dates, policy status, arithmetic) are checked in Python before any LLM is called. The LLM layer only evaluates qualitative evidence and policy compliance.

**Confidence thresholds as single source of truth.** `config.py` values are injected into the Pass 2 system prompt at startup and read again by `post_check()`. If thresholds change, both the prompt and enforcement logic update together automatically.

**Prompt caching.** Both system prompts are marked `cache_control: ephemeral`. The policy wording block in Pass 2 is also cached — and because Pass 2 has no volatile document URLs in its context, cache hit rates are higher than a single-call approach.

**XML delimiters on user-controlled fields.** Free-text claimant fields (`full_name`, `booking_reference`, `description`) are wrapped in XML tags in both passes to prevent prompt injection.

**Forced structured output.** Both passes use `tool_choice: {type: "tool"}` — Pass 1 produces `EvidenceReport`, Pass 2 produces `ClaimDecision`. No regex, no fallback parsing — Pydantic validates directly.
