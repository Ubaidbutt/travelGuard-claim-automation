# TravelGuard — AI Claims Adjudication

An AI-powered travel insurance claims processing platform. Claimants submit a trip cancellation claim through a guided web form. The system retrieves their policy, runs deterministic eligibility rules, sends the policy wording and proof documents to Claude, and produces a structured decision — approved, rejected, or needs review — typically in under 60 seconds.

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
  ▼ BackgroundTask (~10–30s)
Pipeline service
  ├── 1. Fetch full case from DB
  ├── 2. MockNNTravelAdapter.fetch()   → PolicySchedule
  ├── 3. get_mock_wording()            → PolicyWording (cached PDF text)
  ├── 4. rule_engine.pre_check()       → hard reject if ineligible (no LLM call)
  ├── 5. engine.model.assess_claim()   → Claude via Anthropic SDK (tool_use)
  ├── 6. rule_engine.post_check()      → confidence thresholds + coverage cap
  └── 7. update_decision()             → writes status, summary, amount, audit JSONB
  │
  ▼
Supabase (Postgres + Storage)
  ├── claim_case table       All case data, decision, full audit JSONB
  └── claim-documents bucket Uploaded proof files (public read)
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

Single table. No joins, no separate decision table.

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
  assessment_detail    JSONB,        -- full LLM audit: extractions, compliance, reasoning, confidence
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_claim_case_claim_id ON claim_case(claim_id);
```

Status lifecycle: `pending` → `processing` → `approved` | `rejected` | `needs_more_info` | `failed`

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

**Direct Anthropic SDK, not LangChain.** One well-structured Claude call, typed Pydantic response, deterministic rule checks. Every step is readable Python.

**Policy wording as source of truth.** Claude receives the actual policy PDF text — not a pre-extracted rule list. Coverage decisions reflect precise legal wording, not a hardcoded lookup.

**Rule engine separated from LLM.** Hard facts (dates, policy status, arithmetic) are checked in Python before Claude is ever called. Claude only evaluates qualitative policy compliance.

**Confidence thresholds as single source of truth.** `config.py` values are injected into the system prompt template at startup and read again by `post_check()`. If thresholds change, both the prompt and enforcement logic update together automatically.

**Prompt caching.** System prompt and policy wording are marked `cache_control: ephemeral`. All claims on the same product tier amortize the cost of the wording block (largest block, 5,000–15,000 tokens).

**XML delimiters on user-controlled fields.** Free-text claimant fields (`full_name`, `booking_reference`, `description`) are wrapped in XML tags to prevent prompt injection.

**Forced structured output.** `tool_choice: {type: "tool", name: "submit_claim_decision"}` guarantees a machine-parseable `ClaimDecision` response. No regex, no fallback parsing — Pydantic validates directly.
