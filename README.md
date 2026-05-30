# TravelGuard — AI Claims Adjudication

An AI-powered travel insurance claims processing platform. Claimants submit a trip cancellation claim through a guided web form, and the system retrieves their policy, runs deterministic eligibility rules, reads the actual policy wording and proof documents with Claude, and produces a structured decision — approved, rejected, or needs review — in under 60 seconds.

---

## What this is

Travel insurance claims today take 3–10 business days. Most of that time is a human adjuster reading a form, cross-referencing a policy PDF, and writing a response. Decision quality varies between adjusters, there is no structured reasoning trail, and cost per claim is high.

TravelGuard sits as an intelligent processing layer between an insurer's existing systems and their claimants. It does not replace the insurer's database or policy engine — it adds an AI reasoning layer on top.

**The core technical insight:** most straightforward claims are highly rule-based. A well-designed LLM pipeline with a deterministic rule layer can handle the majority of cases automatically, routing only genuinely ambiguous cases to a human adjuster. Industry data shows this reduces resolution time by 75% and cost per claim by 30–40%, with straight-through processing rates jumping from 10–15% to 70–90%.

---

## Current scope (POC)

This is a fully working end-to-end proof of concept. The scope is deliberate — one claim type, one mocked insurer, and a minimal frontend — so the AI layer gets the engineering attention it deserves.

| Dimension | Current state |
|---|---|
| Claim type | Trip cancellation only |
| Insurer | NN Travel (mocked — returns realistic hardcoded policy data) |
| Auth | None — claimants use their claim reference number |
| Policy wording | Full PDF stored locally, extracted at runtime via pypdf |
| Background jobs | FastAPI `BackgroundTasks` (in-process, no queue) |
| Frontend | Marketing landing page + claim submission form + status view |

---

## Architecture

```
Claimant (browser)
      │
      ▼
  Next.js 16 Frontend
  ├── / (landing page)
  ├── /submit (4-step claim form + document uploads to Supabase Storage)
  └── /status (claim reference lookup + result display)
      │
      ▼
  FastAPI Backend
  ├── POST /claims       Creates case → triggers background pipeline → returns claim_id
  ├── GET  /claims/{id}  Returns current status, decision summary, approved amount
  └── GET  /health
      │
      ▼ (background task, ~10–30s)
  Pipeline service
  ├── 1. Fetch full case from DB
  ├── 2. MockNNTravelAdapter.fetch()   →  PolicySchedule
  ├── 3. get_mock_wording(tier)        →  PolicyWording (extracted PDF text)
  ├── 4. rule_engine.pre_check()       →  hard reject if ineligible (skips LLM)
  ├── 5. engine.model.assess_claim()  →  Claude via Anthropic SDK (tool_use)
  ├── 6. rule_engine.post_check()     →  confidence thresholds + coverage cap
  └── 7. update_decision()            →  writes status, summary, amount, audit detail
      │
      ▼
  Supabase (Postgres + Storage)
  ├── claim_case table   (all case data, decision, full audit JSONB)
  └── claim-documents    (uploaded proof files)
```

### LLM layer

The LLM call is a single structured tool call to `claude-sonnet-4-20250514`. The model receives four context blocks in one message:

1. **Policy wording** (the full PDF text) — marked cacheable; same for all claims on a given tier, so subsequent calls hit the Anthropic prompt cache
2. **Policy schedule** — the customer's specific limits, coverage dates, and claim history
3. **Claim form data** — user-supplied fields wrapped in XML delimiters to prevent prompt injection
4. **Uploaded documents** — each file passed as a `document` or `image` block directly by URL from Supabase Storage; Claude reads them natively

The model is forced to respond via `tool_choice: {type: "tool", name: "submit_claim_decision"}` with a schema derived from the `ClaimDecision` Pydantic model. No manual JSON parsing. The response is validated with `model_validate()`.

### Rule engine

Runs independently of the LLM. Pre-checks fire before the LLM call to avoid unnecessary token spend:

| Rule | What it checks |
|---|---|
| `expired_policy` | Policy status must be `active` |
| `outside_filing_window` | Claim must be filed within 90 days of cancellation |
| `foreseeable_event` | Claimant must not have known the reason before purchasing |
| `net_claim_zero` | Total cost minus refunds already received must be positive |

Post-checks apply after the LLM responds:

- **Confidence thresholds** (from config): `confidence >= 0.80` → approved, `< 0.50` → rejected, otherwise `needs_more_info`
- **Coverage cap**: approved amount is capped at the policy's `trip_cancellation` limit

The confidence thresholds are injected into the system prompt template so the model's understanding of the scale and the post-check logic are always in sync.

---

## Tech stack

### Backend

| Concern | Technology |
|---|---|
| Language | Python 3.12 |
| Framework | FastAPI |
| Data validation | Pydantic v2 |
| Config | pydantic-settings |
| Database client | supabase-py |
| LLM | Anthropic SDK (direct, no LangChain) |
| PDF extraction | pypdf |
| Package manager | uv |

### Frontend

| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query 5 |
| File uploads | Supabase JS SDK |
| Icons | Lucide React |

### Infrastructure

| Concern | Technology |
|---|---|
| Database | Supabase (Postgres) |
| File storage | Supabase Storage (`claim-documents` bucket) |
| Frontend hosting | Vercel |
| Backend hosting | Railway |

---

## Project structure

```
claim-automation/
├── backend/
│   ├── main.py                        FastAPI app, CORS, router registration
│   ├── config.py                      Settings via pydantic-settings
│   ├── pyproject.toml
│   ├── .env.example
│   ├── adapters/
│   │   ├── base.py                    InsurerAdapter abstract base class
│   │   ├── router.py                  Adapter registry (get_adapter)
│   │   ├── mock_nn_travel.py          MockNNTravelAdapter + get_mock_wording()
│   │   ├── mock_policies.json         10 hardcoded policy profiles
│   │   └── master_policy.pdf          Full policy wording PDF (all tiers)
│   ├── engine/
│   │   ├── model.py                   assess_claim() — Anthropic SDK call
│   │   ├── rule_engine.py             pre_check() + post_check()
│   │   └── prompts/
│   │       └── claim_assessment_system_prompt.txt
│   ├── models/
│   │   ├── claim.py                   ClaimCreateRequest, ClaimCase, ClaimStatusResponse
│   │   ├── policy.py                  PolicySchedule, PolicyWording
│   │   └── decision.py                ClaimDecision (LLM output schema)
│   ├── routers/
│   │   └── claims.py                  POST /claims, GET /claims/{claim_id}
│   ├── services/
│   │   ├── claim_service.py           create(), get_by_claim_id(), update_decision()
│   │   └── pipeline_service.py        process() — full pipeline orchestration
│   └── db/
│       └── client.py                  Supabase client singleton
│
└── frontend/
    ├── app/
    │   ├── layout.tsx                 Root layout, TanStack Query provider
    │   ├── page.tsx                   / — Marketing landing page
    │   ├── submit/page.tsx            /submit — redirects into ClaimForm
    │   └── status/page.tsx            /status — claim lookup + result
    ├── components/
    │   ├── ClaimForm/
    │   │   ├── index.tsx              Multi-step shell + form state
    │   │   ├── StepPersonalDetails.tsx
    │   │   ├── StepInsuranceDetails.tsx
    │   │   ├── StepDocuments.tsx      Dynamic upload slots by cancellation reason
    │   │   ├── StepReview.tsx         Summary before submit
    │   │   └── schema.ts              Zod schema for all steps
    │   ├── DocumentSlot.tsx           Upload slot: spinner, preview, remove
    │   ├── ClaimResult.tsx            Approved / rejected / pending display
    │   ├── StatusContent.tsx          Status page logic (URL param, fetch, display)
    │   └── Footer.tsx
    ├── lib/
    │   ├── api.ts                     submitClaim(), getClaimStatus()
    │   ├── storage.ts                 Supabase Storage upload helper
    │   ├── documentSlots.ts           Document slot config per cancellation reason
    │   └── claimTypes.ts              Claim type cards for landing page
    ├── hooks/
    │   └── useClaimStatus.ts
    └── types/
        └── claim.ts
```

---

## Database schema

Single table — no joins, no separate decision table.

```sql
CREATE TABLE claim_case (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id             TEXT        NOT NULL UNIQUE,  -- e.g. CLM-A3F9K2X8

  -- Form fields
  full_name            TEXT        NOT NULL,
  email                TEXT        NOT NULL,
  phone                TEXT        NOT NULL,
  policy_number        TEXT        NOT NULL,
  departure_date       DATE        NOT NULL,
  return_date          DATE        NOT NULL,
  destination_country  TEXT        NOT NULL,
  booking_reference    TEXT        NOT NULL,
  cancellation_reason  TEXT        NOT NULL,
  cancellation_date    DATE        NOT NULL,
  aware_of_reason_date DATE        NOT NULL,
  total_cost           NUMERIC(10,2) NOT NULL,
  already_refunded     NUMERIC(10,2) NOT NULL DEFAULT 0,
  description          TEXT        NOT NULL,

  -- Uploaded documents: [{document_type, file_url, file_name}]
  attachments          JSONB[]     NOT NULL DEFAULT '{}',

  -- Decision (populated by pipeline)
  status               TEXT        NOT NULL DEFAULT 'pending',
  decision_summary     TEXT,
  approved_amount      NUMERIC(10,2),
  assessment_detail    JSONB,  -- full LLM reasoning, document extractions, compliance check

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claim_case_claim_id ON claim_case(claim_id);
```

Run this SQL in the Supabase dashboard SQL editor to create the table before starting.

---

## Running locally

### Prerequisites

- Python 3.12+, `uv` ([install](https://docs.astral.sh/uv/getting-started/installation/))
- Node.js 20+, npm
- A Supabase project with the `claim_case` table created (schema above)
- A Supabase Storage bucket named `claim-documents` (public read)
- An Anthropic API key

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Copy and fill in environment variables
cp .env.example .env
# Edit .env — set SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY

# Start the development server
uv run fastapi dev main.py
# API is available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

**Environment variables** (`backend/.env`):

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>   # use service role, not anon

ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514     # optional, this is the default

CONFIDENCE_APPROVE=0.80                   # optional — LLM decisions above this → approved
CONFIDENCE_REJECT=0.50                    # optional — below this → rejected, between → needs_more_info

ENVIRONMENT=development                   # development allows all CORS origins
FRONTEND_URL=http://localhost:3000
```

### Frontend

```bash
cd frontend

npm install

# Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local

npm run dev
# App is available at http://localhost:3000
```

**Environment variables** (`frontend/.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>   # use anon key here (public)
```

---

## Mock policy numbers

Use these policy numbers in the claim form to test different scenarios:

| Policy number | Holder | Tier | Status | Trip cancellation limit | Scenario |
|---|---|---|---|---|---|
| `POL-7823419` | Sarah Müller | Premium | Active | €5,000 | Clean active policy, no prior claims |
| `POL-3156082` | Jan de Vries | Basic | **Expired** | €2,000 | Triggers `expired_policy` rule rejection |
| `POL-9047253` | Amira Hassan | Classic | Active | €5,000 | Active but 3 prior claims (2 in last 12 months) |
| `POL-4512896` | Pieter van Dam | Basic | Active | €1,500 | Basic tier, €250 deductible |
| `POL-6734120` | Isabelle Fontaine | Premium | Active | €15,000 | High-limit premium policy |
| `POL-8293047` | Nikolai Petrov | Premium | Active | €15,000 | Premium + adventure sports + rental car add-ons |
| `POL-1564783` | Yuki Tanaka | Classic | Active | €5,000 | Classic + rental car add-on, some prior history |
| `POL-5981624` | Marco Esposito | Classic | **Suspended** | €5,000 | Triggers `expired_policy` rule rejection |
| `POL-2748391` | Fatima Al-Rashidi | Premium | Active | €15,000 | Premium + adventure sports + business equipment |
| `POL-4163057` | Lena Bergström | Basic | Active | €1,500 | Young policyholder, clean history |

Any policy number not in this list returns a `PolicyNotFoundError` and the claim is rejected.

---

## End-to-end flow

```
1.  User fills the 4-step claim form at /submit
    Step 1: Name, email, phone, policy number
    Step 2: Travel dates, destination, booking ref, cancellation reason,
            cancellation date, date aware of reason, costs, description
    Step 3: Upload proof documents (slots shown by cancellation reason)
    Step 4: Review summary → Submit

2.  On reaching Step 3, the frontend generates a temp UUID as a storage prefix.
    Each uploaded file goes to:
    claim-documents/{temp-uuid}/{document_type}/{uuid}.{ext}

3.  On Submit:
    → attachments record converted to [{document_type, file_url, file_name}]
    → POST /claims — backend inserts the row, returns {claim_id, status: "pending"}
    → Frontend stores claim_id in sessionStorage
    → Redirect to /status?id=CLM-XXXXXXXX

4.  Backend pipeline runs asynchronously (~10–30s):
    → status: pending → processing
    → Fetch PolicySchedule from mock adapter
    → Extract PDF wording text (cached in memory after first call)
    → Rule engine pre-checks — hard reject if any fail
    → LLM assessment (Claude reads wording + schedule + form data + documents)
    → Post-checks (confidence thresholds + coverage cap)
    → Update claim_case: status, decision_summary, approved_amount, assessment_detail

5.  User on /status enters their claim ID:
    → GET /claims/{id}
    → Shows approved (with amount) / rejected / pending / processing
```

---

## API reference

### `POST /claims`

Submit a new claim. Returns immediately; processing runs in background.

**Request body** (`ClaimCreateRequest`):

```json
{
  "full_name": "Sarah Müller",
  "email": "sarah@example.com",
  "phone": "+31612345678",
  "policy_number": "POL-7823419",
  "departure_date": "2026-06-15",
  "return_date": "2026-06-22",
  "destination_country": "Spain",
  "booking_reference": "BA-92847",
  "cancellation_reason": "illness_claimant",
  "cancellation_date": "2026-06-10",
  "aware_of_reason_date": "2026-06-10",
  "total_cost": 1800.00,
  "already_refunded": 0.00,
  "description": "I developed acute appendicitis on 10 June...",
  "attachments": [
    {
      "document_type": "physician_statement",
      "file_url": "https://xxx.supabase.co/storage/v1/object/public/claim-documents/...",
      "file_name": "dr_note.pdf"
    }
  ]
}
```

**Response** `201 Created`:

```json
{ "claim_id": "CLM-A3F9K2X8", "status": "pending" }
```

Valid `cancellation_reason` values: `illness_claimant` `illness_family` `death_family` `natural_disaster` `carrier_bankruptcy` `home_uninhabitable` `jury_duty` `job_loss` `travel_advisory`

Valid `document_type` values: `booking_confirmation` `payment_proof` `physician_statement` `death_certificate` `redundancy_letter` `official_report` `travel_advisory_copy` `cancellation_proof` `other`

---

### `GET /claims/{claim_id}`

Fetch current case status.

**Response** `200 OK`:

```json
{
  "claim_id": "CLM-A3F9K2X8",
  "status": "approved",
  "decision_summary": "Your trip cancellation claim has been approved. The physician statement confirms the illness prevented travel and all documents are consistent with your Premium tier policy coverage.",
  "approved_amount": 1700.00,
  "created_at": "2026-05-30T10:30:00Z",
  "updated_at": "2026-05-30T10:30:22Z"
}
```

`status` values: `pending` `processing` `approved` `rejected` `needs_more_info` `failed`

Returns `404` if the claim ID is not found.

---

## Key design decisions

**Direct Anthropic SDK, not LangChain.** The pipeline is explicit, readable Python. The orchestrator makes one well-structured Claude call, parses a typed Pydantic response, and the rule engine applies deterministic checks. An interviewer can read the code and understand exactly what the system does at every step.

**Policy wording as source of truth.** Claude does not receive a pre-extracted list of covered reasons. It receives the actual policy wording document and reads it directly — the same way a human adjuster would. This means coverage decisions reflect the precise legal text rather than a hardcoded lookup table that would need to be maintained manually per insurer and per tier.

**Two-step integration pattern.** The mock adapter returns a `PolicySchedule` (holder details, product tier, coverage limits, claim history). The product tier from this response is then used to look up the policy wording. These are deliberately separate concerns — external data about the customer, and internal management of policy documents.

**Rule engine separated from LLM.** The rule engine checks facts (is the policy active? was the claim filed in time?). The LLM checks policy compliance (is this reason covered? is the evidence sufficient?). These are never mixed. In a regulated industry, an auditor must be able to read the rule engine and verify outcomes without needing to understand how the LLM works.

**Confidence thresholds injected into system prompt.** The config values for `CONFIDENCE_APPROVE` and `CONFIDENCE_REJECT` are formatted into the system prompt template at startup. The model's understanding of the thresholds and the post-check logic are always in sync.

**Prompt caching.** The system prompt and policy wording blocks are marked with `cache_control: {type: "ephemeral"}`. For all claims on the same policy tier, the wording block hits the Anthropic cache and avoids re-processing those tokens.

**XML delimiters around user-controlled fields.** Free-text fields submitted by claimants (`full_name`, `booking_reference`, `description`) are wrapped in XML tags in the prompt to prevent prompt injection from user-supplied content.

---

## Roadmap

Each phase is a discrete increment that builds on the previous one without rewriting the existing system.

### Phase 2 — Real integration layer
Replace the mock adapter with real insurer API integrations. Build an admin portal for uploading policy wording PDFs with effective dates. Each insurer connects via a dedicated adapter that maps their response to `PolicySchedule` — the pipeline never changes.

### Phase 3 — Additional claim types
Add medical emergency, baggage loss, and travel delay. Adding a claim type is: a new form schema, claim-type-specific rule engine additions, and new eval scenarios. The pipeline steps themselves do not change.

### Phase 4 — Auth and multi-tenancy
Move from no-auth to proper adjuster accounts (NextAuth or Auth0). Add row-level security in Supabase per `insurer_id` so multiple insurers can use the system with full data isolation.

### Phase 5 — Async job queue and observability
Replace `BackgroundTasks` with Celery + Redis. Add structured JSON logging per case and pipeline step, Sentry for error tracking, and Prometheus metrics (claims per hour, approval rates, LLM latency, p99 processing time).

### Phase 6 — Reporting and analytics
Dashboard for insurer clients: claim volume, status distribution, top rejection reasons, LLM confidence distribution. CSV export and scheduled weekly summary emails.

### Phase 7 — Feedback loop
Track every human adjuster override as a training signal. Build a prompt iteration workflow that logs which prompt version produced which decision. Run eval scenarios on a schedule to catch regressions when the model is updated.

---

## Commercial model

**Target customer:** Mid-size and regional travel insurance carriers who have manual claims processes and cannot afford enterprise vendors (Shift Technology, Sprout.ai) with six-figure contracts and long implementation timelines.

**Pricing:** Usage-based SaaS. Monthly platform fee + per-claim processing fee that scales directly with the insurer's volume and ROI.

**The moat:** The integration adapters. Every insurer runs different systems. Each adapter takes real engineering effort. Once you have five adapters and five clients, new competitors face the same integration work you already did — while you are already improving on live production data.
