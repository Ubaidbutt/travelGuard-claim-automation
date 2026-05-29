# POC Specification
## AI Travel Insurance Claims — Trip Cancellation

**Version:** 1.0
**Last updated:** May 2026
**Status:** Ready for implementation

---

## 1. What This Builds

A proof of concept for an AI-powered travel insurance claims system. The scope is deliberately minimal — one claim type, one insurer (mocked), two API endpoints, and one frontend with two views. The goal is a working end-to-end flow that demonstrates the AI reasoning layer clearly.

**The full flow:**

```
User fills claim form + uploads proof documents
        ↓
Frontend uploads files directly to Supabase Storage
        ↓
Frontend POST /claims → backend creates ClaimCase → returns claim_id
        ↓
Backend triggers background pipeline:
  - Fetches mock policy data
  - Calls Claude with all context
  - Applies hard rule checks
  - Updates ClaimCase with decision + summary
        ↓
User returns with claim_id → GET /claims/{id} → sees approved/rejected + summary
```

---

## 2. Technology Decisions

### Frontend

| Concern | Technology | Version |
|---|---|---|
| Framework | Next.js | 15.x (App Router) |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Component library | shadcn/ui | latest |
| Form handling | React Hook Form | 7.x |
| Form validation | Zod | 3.x |
| Data fetching | TanStack Query | 5.x |
| File uploads | Supabase JS SDK | 2.x |
| Icons | Lucide React | latest |
| Date utilities | date-fns | 3.x |
| Linting | ESLint + eslint-config-next | bundled |
| Formatting | Prettier | 3.x |

### Backend

| Concern | Technology | Version |
|---|---|---|
| Language | Python | 3.12.x |
| Framework | FastAPI | 0.136.x (`pip install "fastapi[standard]"`) |
| ASGI server | Uvicorn | bundled with fastapi[standard] |
| Data validation | Pydantic | v2.x |
| Config management | pydantic-settings | 2.x |
| Env file loading | python-dotenv | 1.x |
| Database client | supabase-py | 2.x |
| LLM client | langchain-anthropic | 0.3.x |
| LLM base types | langchain-core | 0.3.x |
| Anthropic SDK | anthropic | 0.103.x (transitive, pinned) |
| Package manager | uv | latest |

### LLM

| Concern | Decision |
|---|---|
| Model | `claude-sonnet-4-20250514` |
| Context window | 1 million tokens — no truncation concerns for this use case |
| Structured output | `.with_structured_output(ClaimDecision)` via LangChain |
| Provider portability | LangChain used only for client + structured output. Swap provider = one import line |

### Infrastructure

| Concern | Technology |
|---|---|
| Database | Supabase (Postgres) |
| File storage | Supabase Storage (`claim-documents` bucket, public read) |
| Frontend hosting | Vercel |
| Backend hosting | Railway |
| Background jobs | FastAPI `BackgroundTasks` (no Redis/Celery needed for POC) |

### Testing

| Library | Version | Purpose |
|---|---|---|
| pytest | 8.x | Test runner |
| pytest-asyncio | 0.24.x | Async test support |
| httpx | 0.27.x | FastAPI test client |
| pytest-cov | 5.x | Coverage reporting |

### Code Quality

| Library | Version | Purpose |
|---|---|---|
| ruff | 0.6.x | Linter + formatter (replaces flake8 + black) |
| mypy | 1.x | Static type checking |

---

## 3. Data Model

### Single table: `claim_case`

Everything lives in one table. No joins, no separate decision or attachment tables. Status starts as `pending` and is updated to `approved` or `rejected` by the pipeline.

```sql
CREATE TABLE claim_case (
  -- Identity
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id             TEXT        NOT NULL UNIQUE,
  -- e.g. CLM-A3F9K2X8. Returned to user on submission. Used for status lookup.

  -- Personal details (submitted via form)
  full_name            TEXT        NOT NULL,
  email                TEXT        NOT NULL,
  phone                TEXT        NOT NULL,
  policy_number        TEXT        NOT NULL,

  -- Insurance details (submitted via form)
  departure_date       DATE        NOT NULL,
  return_date          DATE        NOT NULL,
  destination_country  TEXT        NOT NULL,
  booking_reference    TEXT        NOT NULL,
  cancellation_reason  TEXT        NOT NULL,
  -- Allowed values: illness_claimant | illness_family | death_family |
  --   natural_disaster | carrier_bankruptcy | home_uninhabitable |
  --   jury_duty | job_loss | travel_advisory
  cancellation_date    DATE        NOT NULL,
  aware_of_reason_date DATE        NOT NULL,
  -- Must be >= policy purchase date (rule engine checks this)
  total_cost           NUMERIC(10,2) NOT NULL,
  already_refunded     NUMERIC(10,2) NOT NULL DEFAULT 0,
  description          TEXT        NOT NULL,

  -- Uploaded proof documents
  -- Array of JSON objects: { document_type, file_url, file_name }
  -- document_type values: booking_confirmation | payment_proof |
  --   physician_statement | death_certificate | redundancy_letter |
  --   official_report | travel_advisory_copy | cancellation_proof | other
  attachments          JSONB[]     NOT NULL DEFAULT '{}',

  -- Decision (populated by pipeline after processing)
  status               TEXT        NOT NULL DEFAULT 'pending',
  -- Values: pending | processing | approved | rejected | failed
  decision_summary     TEXT,
  -- Brief plain-text explanation shown to claimant. NULL until processed.
  approved_amount      NUMERIC(10,2),
  -- NULL if rejected. Set to net approved payout if approved.

  -- Metadata
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for claim_id lookups (the primary user-facing query)
CREATE INDEX idx_claim_case_claim_id ON claim_case(claim_id);
```

### `claim_id` generation

Generated in the backend at case creation time. Not a UUID — a human-readable reference the user can write down or copy.

```python
import random
import string

def generate_claim_id() -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=8))
    return f"CLM-{suffix}"
    # e.g. CLM-A3F9K2X8
```

### Attachments column shape

Each element in the `attachments` JSONB array:

```json
{
  "document_type": "physician_statement",
  "file_url": "https://xxx.supabase.co/storage/v1/object/public/claim-documents/abc123.pdf",
  "file_name": "dr_note.pdf"
}
```

### Supabase Storage bucket

Bucket name: `claim-documents`
Access policy: public read (URLs are non-guessable UUIDs — sufficient for POC)
File path pattern: `{claim_id}/{document_type}/{uuid}.{ext}`
e.g. `CLM-A3F9K2X8/physician_statement/f47ac10b-58cc-4372-a567.pdf`

---

## 4. Backend

### 4.1 Project Structure

```
backend/
├── main.py                   # FastAPI app, router registration, CORS
├── config.py                 # Settings via pydantic-settings
│
├── routers/
│   └── claims.py             # POST /claims, GET /claims/{claim_id}
│
├── models/
│   ├── claim.py              # ClaimCreateRequest, ClaimResponse, AttachmentInput
│   ├── policy.py             # PolicySchedule, PolicyWording
│   └── decision.py           # ClaimDecision (LLM output schema)
│
├── services/
│   ├── claim_service.py      # create(), get_by_claim_id(), update_decision()
│   └── pipeline_service.py   # process(case_id) — full pipeline orchestration
│
├── adapters/
│   ├── base.py               # InsurerAdapter abstract base class
│   ├── router.py             # get_adapter(insurer_id) registry
│   └── mock_nn_travel.py     # Returns hardcoded PolicySchedule per policy_number
│
├── engine/
│   ├── model.py              # assess_claim() — LangChain client + message builder
│   └── rule_engine.py        # pre_check() + post_check()
│
├── db/
│   └── client.py             # Supabase client singleton
│
├── .env                      # Environment variables (not committed)
├── pyproject.toml
└── tests/
    ├── test_claims.py        # Endpoint tests
    ├── test_rule_engine.py   # Rule engine unit tests
    └── eval/
        ├── scenarios.json    # Test scenarios with expected decisions
        └── test_pipeline.py  # Full pipeline eval runner
```

---

### 4.2 Configuration

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str       # Service role key — bypasses RLS

    # Anthropic / LangChain
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-20250514"

    # Pipeline
    confidence_threshold: float = 0.75
    # LLM decisions below this confidence → rejected with under_review note

    # App
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

### 4.3 Database Client

```python
# db/client.py
from supabase import create_client, Client
from config import settings

_client: Client | None = None

def get_db() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )
    return _client
```

---

### 4.4 Pydantic Models

```python
# models/claim.py
from pydantic import BaseModel, EmailStr
from datetime import date
from decimal import Decimal
from typing import Literal

CancellationReason = Literal[
    'illness_claimant',
    'illness_family',
    'death_family',
    'natural_disaster',
    'carrier_bankruptcy',
    'home_uninhabitable',
    'jury_duty',
    'job_loss',
    'travel_advisory',
]

DocumentType = Literal[
    'booking_confirmation',
    'payment_proof',
    'physician_statement',
    'death_certificate',
    'redundancy_letter',
    'official_report',
    'travel_advisory_copy',
    'cancellation_proof',
    'other',
]

class AttachmentInput(BaseModel):
    document_type: DocumentType
    file_url: str
    file_name: str

class ClaimCreateRequest(BaseModel):
    # Personal details
    full_name: str
    email: EmailStr
    phone: str
    policy_number: str

    # Insurance details
    departure_date: date
    return_date: date
    destination_country: str
    booking_reference: str
    cancellation_reason: CancellationReason
    cancellation_date: date
    aware_of_reason_date: date
    total_cost: Decimal
    already_refunded: Decimal = Decimal('0')
    description: str

    # Attachments — uploaded to Supabase Storage by frontend before this call
    attachments: list[AttachmentInput] = []

class ClaimCreateResponse(BaseModel):
    claim_id: str           # e.g. CLM-A3F9K2X8 — return to user immediately
    status: str             # always 'pending' at this point

class ClaimStatusResponse(BaseModel):
    claim_id: str
    status: str             # pending | processing | approved | rejected | failed
    decision_summary: str | None
    approved_amount: float | None
    created_at: str
    updated_at: str
```

```python
# models/policy.py
from pydantic import BaseModel
from datetime import date

class PolicyHolder(BaseModel):
    full_name: str
    date_of_birth: date
    email: str

class CoverageLimit(BaseModel):
    benefit: str
    limit: float
    deductible: float

class ClaimHistory(BaseModel):
    total_claims: int
    claims_last_12_months: int
    prior_payouts_total: float

class PolicySchedule(BaseModel):
    policy_number: str
    insurer_id: str
    product_tier: str               # 'basic' | 'classic' | 'premium'
    status: str                     # 'active' | 'expired' | 'suspended'
    purchase_date: date
    coverage_start: date
    coverage_end: date
    holder: PolicyHolder
    coverage_limits: list[CoverageLimit]
    add_ons: list[str]
    claim_history: ClaimHistory

class PolicyWording(BaseModel):
    insurer_id: str
    product_tier: str
    version: str
    extracted_text: str             # full wording text passed to Claude
```

```python
# models/decision.py
from pydantic import BaseModel
from typing import Literal

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
    """
    Structured output schema returned by Claude via .with_structured_output().
    LangChain validates and parses this automatically — no manual JSON parsing.
    """
    document_extractions: list[DocumentExtraction]
    policy_compliance: PolicyComplianceCheck
    decision: Literal['approved', 'rejected', 'needs_more_info']
    confidence: float               # 0.0 to 1.0
    approved_amount: float | None   # set only when decision is approved
    summary: str                    # 2-3 sentence plain-text explanation for the claimant
    full_reasoning: str             # detailed reasoning stored for internal use
```

---

### 4.5 API Endpoints

#### `POST /claims`

Creates a new claim case and triggers background processing.

```
Request body:  ClaimCreateRequest
Response:      ClaimCreateResponse  (201 Created)
```

```python
# routers/claims.py
from fastapi import APIRouter, BackgroundTasks, Depends
from models.claim import ClaimCreateRequest, ClaimCreateResponse, ClaimStatusResponse
from services import claim_service, pipeline_service
from db.client import get_db

router = APIRouter(prefix="/claims", tags=["claims"])

@router.post("", status_code=201, response_model=ClaimCreateResponse)
async def create_claim(
    payload: ClaimCreateRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
):
    # 1. Create the case in DB — returns immediately with claim_id
    case = await claim_service.create(db, payload)

    # 2. Trigger pipeline in background — does not block the response
    background_tasks.add_task(pipeline_service.process, case["id"])

    return ClaimCreateResponse(
        claim_id=case["claim_id"],
        status="pending"
    )

@router.get("/{claim_id}", response_model=ClaimStatusResponse)
async def get_claim(claim_id: str, db=Depends(get_db)):
    case = await claim_service.get_by_claim_id(db, claim_id)
    if not case:
        raise HTTPException(status_code=404, detail="Claim not found")
    return ClaimStatusResponse(**case)
```

#### `GET /claims/{claim_id}`

Fetches current case status. Called by the frontend status view.

```
Path param:    claim_id (e.g. CLM-A3F9K2X8)
Response:      ClaimStatusResponse  (200 OK)
               404 if not found
```

**Response examples:**

While processing:
```json
{
  "claim_id": "CLM-A3F9K2X8",
  "status": "pending",
  "decision_summary": null,
  "approved_amount": null,
  "created_at": "2026-05-28T10:30:00Z",
  "updated_at": "2026-05-28T10:30:00Z"
}
```

After decision:
```json
{
  "claim_id": "CLM-A3F9K2X8",
  "status": "approved",
  "decision_summary": "Your trip cancellation claim has been approved. The physician statement confirms the illness prevented travel and all documents are consistent with your Classic tier policy coverage.",
  "approved_amount": 1800.00,
  "created_at": "2026-05-28T10:30:00Z",
  "updated_at": "2026-05-28T10:30:22Z"
}
```

Rejected:
```json
{
  "claim_id": "CLM-A3F9K2X8",
  "status": "rejected",
  "decision_summary": "Your claim has been rejected. The cancellation date falls outside the 90-day filing window permitted under your policy.",
  "approved_amount": null,
  "created_at": "2026-05-28T10:30:00Z",
  "updated_at": "2026-05-28T10:30:18Z"
}
```

---

### 4.6 Claim Service

```python
# services/claim_service.py
import random
import string
from datetime import datetime, timezone
from db.client import get_db
from models.claim import ClaimCreateRequest

def _generate_claim_id() -> str:
    chars = string.ascii_uppercase + string.digits
    return "CLM-" + "".join(random.choices(chars, k=8))

async def create(db, payload: ClaimCreateRequest) -> dict:
    claim_id = _generate_claim_id()
    data = {
        "claim_id": claim_id,
        "full_name": payload.full_name,
        "email": payload.email,
        "phone": payload.phone,
        "policy_number": payload.policy_number,
        "departure_date": str(payload.departure_date),
        "return_date": str(payload.return_date),
        "destination_country": payload.destination_country,
        "booking_reference": payload.booking_reference,
        "cancellation_reason": payload.cancellation_reason,
        "cancellation_date": str(payload.cancellation_date),
        "aware_of_reason_date": str(payload.aware_of_reason_date),
        "total_cost": float(payload.total_cost),
        "already_refunded": float(payload.already_refunded),
        "description": payload.description,
        "attachments": [a.model_dump() for a in payload.attachments],
        "status": "pending",
    }
    result = db.table("claim_case").insert(data).execute()
    return result.data[0]

async def get_by_claim_id(db, claim_id: str) -> dict | None:
    result = (
        db.table("claim_case")
        .select("claim_id, status, decision_summary, approved_amount, created_at, updated_at")
        .eq("claim_id", claim_id)
        .single()
        .execute()
    )
    return result.data

async def get_full_by_id(db, case_id: str) -> dict | None:
    result = (
        db.table("claim_case")
        .select("*")
        .eq("id", case_id)
        .single()
        .execute()
    )
    return result.data

async def update_decision(
    db,
    case_id: str,
    status: str,
    summary: str,
    approved_amount: float | None
) -> None:
    db.table("claim_case").update({
        "status": status,
        "decision_summary": summary,
        "approved_amount": approved_amount,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", case_id).execute()
```

---

### 4.7 Mock Adapter

The adapter returns a hardcoded `PolicySchedule` based on the policy number. Four profiles cover the key test scenarios.

```python
# adapters/mock_nn_travel.py
from datetime import date
from adapters.base import InsurerAdapter
from models.policy import PolicySchedule, PolicyHolder, CoverageLimit, ClaimHistory

MOCK_POLICIES: dict[str, dict] = {
    "POL-2024-VALID": {
        "product_tier": "classic",
        "status": "active",
        "purchase_date": date(2024, 1, 1),
        "coverage_start": date(2024, 1, 1),
        "coverage_end": date(2025, 12, 31),
        "holder": {"full_name": "Sarah Müller", "date_of_birth": date(1989, 4, 12), "email": "sarah@example.com"},
        "coverage_limits": [
            {"benefit": "trip_cancellation", "limit": 5000.00, "deductible": 100.00},
            {"benefit": "medical", "limit": 100000.00, "deductible": 0.00},
        ],
        "add_ons": [],
        "claim_history": {"total_claims": 0, "claims_last_12_months": 0, "prior_payouts_total": 0.0},
    },
    "POL-2024-EXPRD": {
        "product_tier": "basic",
        "status": "expired",
        "purchase_date": date(2023, 1, 1),
        "coverage_start": date(2023, 1, 1),
        "coverage_end": date(2024, 1, 1),
        "holder": {"full_name": "Jan de Vries", "date_of_birth": date(1975, 8, 3), "email": "jan@example.com"},
        "coverage_limits": [
            {"benefit": "trip_cancellation", "limit": 2000.00, "deductible": 200.00},
        ],
        "add_ons": [],
        "claim_history": {"total_claims": 1, "claims_last_12_months": 0, "prior_payouts_total": 350.0},
    },
    "POL-2024-PRIOR": {
        "product_tier": "classic",
        "status": "active",
        "purchase_date": date(2024, 3, 1),
        "coverage_start": date(2024, 3, 1),
        "coverage_end": date(2025, 12, 31),
        "holder": {"full_name": "Amira Hassan", "date_of_birth": date(1991, 11, 22), "email": "amira@example.com"},
        "coverage_limits": [
            {"benefit": "trip_cancellation", "limit": 5000.00, "deductible": 100.00},
        ],
        "add_ons": [],
        "claim_history": {"total_claims": 3, "claims_last_12_months": 2, "prior_payouts_total": 2400.0},
    },
    "POL-2024-BASIC": {
        "product_tier": "basic",
        "status": "active",
        "purchase_date": date(2024, 6, 1),
        "coverage_start": date(2024, 6, 1),
        "coverage_end": date(2025, 12, 31),
        "holder": {"full_name": "Pieter van Dam", "date_of_birth": date(1983, 2, 14), "email": "pieter@example.com"},
        "coverage_limits": [
            {"benefit": "trip_cancellation", "limit": 1500.00, "deductible": 250.00},
        ],
        "add_ons": [],
        "claim_history": {"total_claims": 0, "claims_last_12_months": 0, "prior_payouts_total": 0.0},
    },
}

# Default profile for unknown policy numbers
DEFAULT_PROFILE = MOCK_POLICIES["POL-2024-VALID"]

class MockNNTravelAdapter(InsurerAdapter):
    async def fetch(self, policy_number: str) -> PolicySchedule:
        profile = MOCK_POLICIES.get(policy_number, DEFAULT_PROFILE)
        return PolicySchedule(
            policy_number=policy_number,
            insurer_id="nn_travel",
            **profile,
            holder=PolicyHolder(**profile["holder"]),
            coverage_limits=[CoverageLimit(**l) for l in profile["coverage_limits"]],
            claim_history=ClaimHistory(**profile["claim_history"]),
        )
```

**Mock policy wording** is a short hardcoded string in `mock_nn_travel.py` per tier — a 2-3 paragraph plain-text summary of what the tier covers. No PDF needed for the POC. The pipeline service calls `get_mock_wording(product_tier)` which returns the appropriate text.

---

### 4.8 LLM Model Layer (`engine/model.py`)

```python
# engine/model.py
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from config import settings
from models.claim import AttachmentInput
from models.decision import ClaimDecision
from models.policy import PolicySchedule, PolicyWording


_llm = ChatAnthropic(
    model=settings.claude_model,
    api_key=settings.anthropic_api_key,
    max_tokens=4096,
).with_structured_output(ClaimDecision)
# .with_structured_output() uses Claude's tool use to constrain output
# to the ClaimDecision schema and auto-validates the Pydantic model.
# No manual JSON parsing required.


async def assess_claim(
    policy_wording: PolicyWording,
    policy_schedule: PolicySchedule,
    case: dict,
    attachments: list[AttachmentInput],
) -> ClaimDecision:
    """
    Single LLM call that receives all claim context and returns
    a structured ClaimDecision. Raises LLMAssessmentError on failure.
    """
    messages = [
        SystemMessage(content=_system_prompt()),
        HumanMessage(content=_user_content(
            policy_wording, policy_schedule, case, attachments
        )),
    ]
    try:
        return await _llm.ainvoke(messages)
    except Exception as e:
        raise LLMAssessmentError(f"LLM call failed: {e}") from e


def _system_prompt() -> str:
    return (
        "You are an experienced travel insurance claims adjuster.\n\n"
        "Assess the trip cancellation claim by:\n"
        "1. Reading the policy wording to understand what is covered\n"
        "2. Checking the customer's policy schedule for their specific limits\n"
        "3. Extracting key facts from each uploaded proof document\n"
        "4. Cross-referencing document facts against the submitted form data\n"
        "5. Determining whether the reason and evidence satisfy the policy\n\n"
        "Be precise. Ground every conclusion in the policy text or document "
        "evidence. Do not infer coverage not explicitly stated."
    )


def _user_content(
    policy_wording: PolicyWording,
    policy_schedule: PolicySchedule,
    case: dict,
    attachments: list[AttachmentInput],
) -> list[dict]:
    content: list[dict] = []

    # 1. Policy wording (primary reference — placed first)
    content.append({"type": "text", "text": (
        f"## POLICY WORDING\n"
        f"Insurer: {policy_wording.insurer_id}\n"
        f"Tier: {policy_wording.product_tier} | Version: {policy_wording.version}\n\n"
        f"{policy_wording.extracted_text}"
    )})

    # 2. Customer policy schedule
    limits_text = "\n".join(
        f"  {l.benefit}: €{l.limit:,.2f} (deductible €{l.deductible:,.2f})"
        for l in policy_schedule.coverage_limits
    )
    content.append({"type": "text", "text": (
        f"## CUSTOMER POLICY SCHEDULE\n"
        f"Policy: {policy_schedule.policy_number} | "
        f"Tier: {policy_schedule.product_tier} | "
        f"Status: {policy_schedule.status}\n"
        f"Purchase date: {policy_schedule.purchase_date} | "
        f"Coverage: {policy_schedule.coverage_start} to {policy_schedule.coverage_end}\n"
        f"Holder: {policy_schedule.holder.full_name} "
        f"(DOB: {policy_schedule.holder.date_of_birth})\n\n"
        f"Coverage limits:\n{limits_text}\n\n"
        f"Add-ons: {', '.join(policy_schedule.add_ons) or 'None'}\n"
        f"Prior claims (12 months): {policy_schedule.claim_history.claims_last_12_months} | "
        f"Prior payouts: €{policy_schedule.claim_history.prior_payouts_total:,.2f}"
    )})

    # 3. Claim form data
    net = float(case["total_cost"]) - float(case["already_refunded"])
    content.append({"type": "text", "text": (
        f"## CLAIM SUBMISSION\n"
        f"Claimant: {case['full_name']} | Email: {case['email']}\n"
        f"Cancellation reason: {case['cancellation_reason']}\n"
        f"Departure: {case['departure_date']} | Return: {case['return_date']}\n"
        f"Destination: {case['destination_country']}\n"
        f"Booking reference: {case['booking_reference']}\n"
        f"Cancellation date: {case['cancellation_date']}\n"
        f"Date aware of reason: {case['aware_of_reason_date']}\n"
        f"Total trip cost: €{float(case['total_cost']):,.2f}\n"
        f"Already refunded: €{float(case['already_refunded']):,.2f}\n"
        f"Net claim: €{net:,.2f}\n\n"
        f"Description:\n{case['description']}"
    )})

    # 4. Uploaded documents (labelled document blocks)
    if attachments:
        content.append({"type": "text",
                        "text": f"## PROOF DOCUMENTS ({len(attachments)} uploaded)"})
        for att in attachments:
            content.append({"type": "text", "text": (
                f"### {att.document_type.replace('_', ' ').title()}\n"
                f"File: {att.file_name}"
            )})
            content.append({
                "type": "document",
                "source": {"type": "url", "url": att.file_url},
            })
    else:
        content.append({"type": "text",
                        "text": "## PROOF DOCUMENTS\nNo documents uploaded."})

    # 5. Final instruction (end of context — highest attention)
    content.append({"type": "text", "text": (
        "Provide your structured assessment. Base every conclusion on "
        "explicit evidence from the documents or policy wording text above."
    )})

    return content


class LLMAssessmentError(Exception):
    pass
```

---

### 4.9 Rule Engine (`engine/rule_engine.py`)

Deterministic checks that run independently of the LLM. Pre-checks fire before the LLM call to avoid unnecessary token spend. Post-checks constrain LLM output.

**Principle:** The rule engine checks facts. The LLM checks policy compliance. These are never mixed.

```python
# engine/rule_engine.py
from dataclasses import dataclass
from datetime import date
from models.policy import PolicySchedule
from models.decision import ClaimDecision

@dataclass
class RuleViolation:
    rule: str
    reason: str

def pre_check(case: dict, policy: PolicySchedule) -> RuleViolation | None:
    """
    Runs before the LLM. Returns a RuleViolation if the claim
    should be rejected outright without calling Claude.
    """
    # 1. Policy must be active
    if policy.status != "active":
        return RuleViolation(
            rule="expired_policy",
            reason=(
                f"Policy {policy.policy_number} has status '{policy.status}'. "
                "An active policy is required at the time of cancellation."
            ),
        )

    # 2. Claim must be filed within 90 days of cancellation
    days = (date.today() - date.fromisoformat(str(case["cancellation_date"]))).days
    if days > 90:
        return RuleViolation(
            rule="outside_filing_window",
            reason=(
                f"Claim filed {days} days after the cancellation date. "
                "Claims must be filed within 90 days of cancellation."
            ),
        )

    # 3. Claimant must not have known about the reason before purchasing the policy
    aware = date.fromisoformat(str(case["aware_of_reason_date"]))
    if aware < policy.purchase_date:
        return RuleViolation(
            rule="foreseeable_event",
            reason=(
                f"Claimant became aware of the cancellation reason on {aware}, "
                f"before the policy was purchased on {policy.purchase_date}. "
                "Pre-existing known events are not covered."
            ),
        )

    # 4. Net claim must be positive after refunds
    net = float(case["total_cost"]) - float(case["already_refunded"])
    if net <= 0:
        return RuleViolation(
            rule="net_claim_zero",
            reason=(
                f"Net claim is €{net:.2f} after accounting for refunds already received. "
                "Nothing to reimburse."
            ),
        )

    return None  # all pre-checks passed


def post_check(
    decision: ClaimDecision,
    policy: PolicySchedule,
) -> ClaimDecision:
    """
    Applies hard limits to the LLM output. Returns the (possibly modified) decision.
    """
    if decision.decision == "approved" and decision.approved_amount:
        # Cap at the trip_cancellation coverage limit
        limit = next(
            (l.limit for l in policy.coverage_limits
             if l.benefit == "trip_cancellation"),
            None,
        )
        if limit and decision.approved_amount > limit:
            decision.approved_amount = limit
            decision.summary += (
                f" Approved amount capped at policy limit of €{limit:,.2f}."
            )
    return decision
```

---

### 4.10 Pipeline Service (`services/pipeline_service.py`)

```python
# services/pipeline_service.py
from db.client import get_db
from adapters.router import get_adapter
from adapters.mock_nn_travel import get_mock_wording
from engine.model import assess_claim, LLMAssessmentError
from engine.rule_engine import pre_check, post_check
from services.claim_service import get_full_by_id, update_decision

async def process(case_id: str) -> None:
    db = get_db()

    # Mark as processing immediately
    db.table("claim_case").update({"status": "processing"}).eq("id", case_id).execute()

    try:
        # 1. Fetch full case from DB
        case = await get_full_by_id(db, case_id)

        # 2. Fetch policy schedule from mock adapter (Step 1 of two-step pattern)
        adapter = get_adapter("nn_travel")
        policy_schedule = await adapter.fetch(case["policy_number"])

        # 3. Fetch policy wording using tier from Step 2
        #    (In production: query policy_wording table by insurer_id + product_tier + purchase_date)
        policy_wording = get_mock_wording(policy_schedule.product_tier)

        # 4. Rule engine pre-checks — skip LLM if hard rejection applies
        violation = pre_check(case, policy_schedule)
        if violation:
            await update_decision(
                db, case_id,
                status="rejected",
                summary=violation.reason,
                approved_amount=None,
            )
            return

        # 5. LLM assessment
        from models.claim import AttachmentInput
        attachments = [AttachmentInput(**a) for a in case.get("attachments", [])]

        llm_result = await assess_claim(
            policy_wording=policy_wording,
            policy_schedule=policy_schedule,
            case=case,
            attachments=attachments,
        )

        # 6. Post-checks — apply coverage cap if needed
        llm_result = post_check(llm_result, policy_schedule)

        # 7. Map LLM decision to case status
        # needs_more_info treated as rejected for POC (no info request flow)
        status = llm_result.decision if llm_result.decision != "needs_more_info" else "rejected"

        await update_decision(
            db, case_id,
            status=status,
            summary=llm_result.summary,
            approved_amount=llm_result.approved_amount,
        )

    except LLMAssessmentError as e:
        await update_decision(db, case_id, status="failed",
                              summary=str(e), approved_amount=None)
    except Exception as e:
        await update_decision(db, case_id, status="failed",
                              summary="An unexpected error occurred.", approved_amount=None)
        raise
```

---

### 4.11 CORS and App Entry

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.claims import router as claims_router
from config import settings

app = FastAPI(title="Claims API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(claims_router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

### 4.12 Environment Variables

```bash
# .env

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514

CONFIDENCE_THRESHOLD=0.75
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
```

---

### 4.13 `pyproject.toml`

```toml
[project]
name = "claims-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.136.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
    "python-dotenv>=1.0.0",
    "supabase>=2.0.0",
    "langchain-anthropic>=0.3.0",
    "langchain-core>=0.3.0",
    "anthropic>=0.103.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=5.0.0",
    "httpx>=0.27.0",
    "ruff>=0.6.0",
    "mypy>=1.0.0",
]

[tool.ruff]
line-length = 88
target-version = "py312"

[tool.pytest.ini_options]
asyncio_mode = "auto"

[tool.mypy]
python_version = "3.12"
strict = true
```

---

## 5. Frontend

### 5.1 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                  # Root layout, TanStack Query provider, fonts
│   ├── page.tsx                    # / — Claim submission form (4 steps)
│   └── status/
│       └── page.tsx                # /status — Claim ID lookup + result display
│
├── components/
│   ├── ui/                         # shadcn/ui generated — do not edit
│   ├── ClaimForm/
│   │   ├── index.tsx               # Multi-step shell, step state management
│   │   ├── StepPersonalDetails.tsx
│   │   ├── StepInsuranceDetails.tsx
│   │   ├── StepDocuments.tsx       # Fixed upload slots per cancellation reason
│   │   ├── StepReview.tsx          # Summary before submit
│   │   └── schema.ts               # Zod schema for all steps
│   ├── DocumentSlot.tsx            # Single upload slot: progress, preview, remove
│   └── ClaimResult.tsx             # Displays approved/rejected decision
│
├── hooks/
│   └── useClaimStatus.ts           # Single fetch by claim_id, no polling
│
├── lib/
│   ├── api.ts                      # POST /claims, GET /claims/{id}
│   ├── storage.ts                  # Supabase Storage upload helper
│   ├── documentSlots.ts            # Document slot config per cancellation reason
│   └── utils.ts                    # formatCurrency, formatDate
│
├── types/
│   └── claim.ts                    # ClaimCreatePayload, ClaimStatusResponse, etc.
│
├── middleware.ts                   # None needed for POC (no auth)
├── next.config.ts
├── tailwind.config.ts
└── .env.local
```

---

### 5.2 Document Slot Config

```typescript
// lib/documentSlots.ts

export interface DocumentSlot {
  id: string                        // matches document_type values on backend
  label: string
  description: string
  required: boolean
  accept: string                    // file input accept attribute
}

export const DOCUMENT_SLOTS: Record<string, DocumentSlot[]> = {
  illness_claimant: [
    { id: 'booking_confirmation', label: 'Booking confirmation',  description: 'Flight, hotel, or package booking',     required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',         description: 'Receipt or bank statement',             required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'physician_statement',  label: 'Physician statement',   description: 'Doctor note confirming illness',        required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'cancellation_proof',   label: 'Cancellation proof',    description: 'Airline/hotel cancellation email',      required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  illness_family: [
    { id: 'booking_confirmation', label: 'Booking confirmation',  description: 'Flight, hotel, or package booking',     required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',         description: 'Receipt or bank statement',             required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'physician_statement',  label: 'Physician statement',   description: 'Doctor note for the family member',     required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  death_family: [
    { id: 'booking_confirmation', label: 'Booking confirmation',  description: 'Flight, hotel, or package booking',     required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',         description: 'Receipt or bank statement',             required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'death_certificate',    label: 'Death certificate',     description: 'Official death certificate',            required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  job_loss: [
    { id: 'booking_confirmation', label: 'Booking confirmation',  description: 'Flight, hotel, or package booking',     required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',         description: 'Receipt or bank statement',             required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'redundancy_letter',    label: 'Redundancy letter',     description: 'Official employer letter',              required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  natural_disaster: [
    { id: 'booking_confirmation', label: 'Booking confirmation',  description: 'Flight, hotel, or package booking',     required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',         description: 'Receipt or bank statement',             required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'official_report',      label: 'Official report',       description: 'Government or news source evidence',    required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  travel_advisory: [
    { id: 'booking_confirmation',    label: 'Booking confirmation',   description: 'Flight, hotel, or package booking',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',           label: 'Payment proof',          description: 'Receipt or bank statement',          required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'travel_advisory_copy',    label: 'Travel advisory',        description: 'Official government advisory copy',  required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  // Fallback for all other reasons
  default: [
    { id: 'booking_confirmation', label: 'Booking confirmation',  description: 'Flight, hotel, or package booking',     required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'payment_proof',        label: 'Payment proof',         description: 'Receipt or bank statement',             required: true,  accept: '.pdf,.jpg,.jpeg,.png' },
    { id: 'other',                label: 'Supporting document',   description: 'Any relevant supporting document',      required: false, accept: '.pdf,.jpg,.jpeg,.png' },
  ],
}

export function getSlotsForReason(reason: string): DocumentSlot[] {
  return DOCUMENT_SLOTS[reason] ?? DOCUMENT_SLOTS['default']
}
```

---

### 5.3 Supabase Storage Upload

```typescript
// lib/storage.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BUCKET = 'claim-documents'

export interface UploadResult {
  file_url: string
  file_name: string
}

export async function uploadDocument(
  file: File,
  claimId: string,          // temp ID generated on frontend before submission
  documentType: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const ext = file.name.split('.').pop()
  const path = `${claimId}/${documentType}/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  return {
    file_url: urlData.publicUrl,
    file_name: file.name,
  }
}
```

Note: `onProgress` is included in the signature for future use. Supabase Storage JS SDK v2 does not expose upload progress natively — show a spinner per slot while uploading rather than a percentage bar.

---

### 5.4 DocumentSlot Component

```typescript
// components/DocumentSlot.tsx
'use client'

import { useState, useRef } from 'react'
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react'
import { uploadDocument } from '@/lib/storage'
import type { DocumentSlot as SlotConfig } from '@/lib/documentSlots'

interface UploadedFile {
  file_url: string
  file_name: string
}

interface Props {
  slot: SlotConfig
  tempClaimId: string           // used for storage path before real claim_id exists
  value: UploadedFile | undefined
  onChange: (value: UploadedFile | undefined) => void
  error?: string
}

export function DocumentSlot({ slot, tempClaimId, value, onChange, error }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10MB')
      return
    }

    setUploading(true)
    setUploadError(undefined)

    try {
      const result = await uploadDocument(file, tempClaimId, slot.id)
      onChange(result)
    } catch (err) {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected after removal
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  // Uploaded state
  if (value) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border
        ${error ? 'border-red-300 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-green-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{slot.label}</p>
            <p className="text-xs text-gray-500 truncate">{value.file_name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="ml-2 p-1 rounded hover:bg-green-100 shrink-0"
          aria-label={`Remove ${slot.label}`}
        >
          <X size={14} className="text-gray-500" />
        </button>
      </div>
    )
  }

  // Upload state
  return (
    <div>
      <label className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2
        border-dashed cursor-pointer transition-colors
        ${error ? 'border-red-300 bg-red-50 hover:border-red-400'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
        {uploading ? (
          <Loader2 size={20} className="animate-spin text-blue-500" />
        ) : (
          <UploadCloud size={20} className="text-gray-400" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {slot.label}
            {slot.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{slot.description}</p>
          <p className="text-xs text-gray-400">PDF, JPG, PNG — max 10MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={slot.accept}
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
      </label>
      {(uploadError || error) && (
        <p className="text-xs text-red-500 mt-1">{uploadError || error}</p>
      )}
    </div>
  )
}
```

---

### 5.5 Form Schema (Zod)

```typescript
// components/ClaimForm/schema.ts
import { z } from 'zod'

const uploadedFile = z.object({
  file_url: z.string().url(),
  file_name: z.string(),
})

export const claimFormSchema = z.object({
  // Step 1 — Personal details
  full_name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:         z.string().email('Invalid email address'),
  phone:         z.string().min(7, 'Invalid phone number'),
  policy_number: z.string().min(1, 'Policy number is required'),

  // Step 2 — Insurance details
  departure_date:       z.string().min(1, 'Required'),
  return_date:          z.string().min(1, 'Required'),
  destination_country:  z.string().min(1, 'Required'),
  booking_reference:    z.string().min(1, 'Required'),
  cancellation_reason:  z.enum([
    'illness_claimant', 'illness_family', 'death_family',
    'natural_disaster', 'carrier_bankruptcy', 'home_uninhabitable',
    'jury_duty', 'job_loss', 'travel_advisory',
  ], { required_error: 'Select a reason' }),
  cancellation_date:    z.string().min(1, 'Required'),
  aware_of_reason_date: z.string().min(1, 'Required'),
  total_cost:           z.number({ invalid_type_error: 'Enter a valid amount' }).positive(),
  already_refunded:     z.number().min(0).default(0),
  description:          z.string().min(30, 'Please provide more detail (min 30 characters)'),

  // Step 3 — Attachments (keyed by document_type / slot.id)
  attachments: z.record(z.string(), uploadedFile.optional()),
})

export type ClaimFormValues = z.infer<typeof claimFormSchema>
```

---

### 5.6 API Client

```typescript
// lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface ClaimCreatePayload {
  full_name: string
  email: string
  phone: string
  policy_number: string
  departure_date: string
  return_date: string
  destination_country: string
  booking_reference: string
  cancellation_reason: string
  cancellation_date: string
  aware_of_reason_date: string
  total_cost: number
  already_refunded: number
  description: string
  attachments: { document_type: string; file_url: string; file_name: string }[]
}

export interface ClaimStatusResponse {
  claim_id: string
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'failed'
  decision_summary: string | null
  approved_amount: number | null
  created_at: string
  updated_at: string
}

export async function submitClaim(
  payload: ClaimCreatePayload
): Promise<{ claim_id: string; status: string }> {
  const res = await fetch(`${BASE_URL}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? 'Failed to submit claim')
  }
  return res.json()
}

export async function getClaimStatus(
  claimId: string
): Promise<ClaimStatusResponse> {
  const res = await fetch(`${BASE_URL}/claims/${claimId}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Claim not found')
    throw new Error('Failed to fetch claim status')
  }
  return res.json()
}
```

---

### 5.7 Pages

#### `/` — Claim Submission Form

Four-step form. Steps 1 and 2 are standard fields. Step 3 shows upload slots driven by the `cancellation_reason` selected in Step 2. Step 4 is a review summary.

**Step flow:**

```
Step 1: Personal details      → full_name, email, phone, policy_number
Step 2: Insurance details     → travel dates, destination, booking_reference,
                                cancellation_reason, cancellation_date,
                                aware_of_reason_date, total_cost,
                                already_refunded, description
Step 3: Documents             → DocumentSlot components for each slot in
                                getSlotsForReason(cancellation_reason)
Step 4: Review + Submit       → Summary of all data, submit button
```

On submit:
1. Convert `attachments` record to array — filter out undefined slots
2. `POST /claims` with the full payload
3. On success: store `claim_id` in `sessionStorage`, redirect to `/status?id={claim_id}`
4. On error: show inline error on Step 4

A temporary client-side claim ID (e.g. a UUID) is generated when the form first mounts. This is used as the Supabase Storage path prefix for uploaded files before the real `claim_id` exists. It keeps all files for one submission together in Storage regardless of whether the form is ultimately submitted.

#### `/status` — Status View

Two states:

**Input state** — form with a single `claim_id` text input. Pre-populated from `sessionStorage` if coming from a fresh submission. On submit: fetch status from backend, show result below.

**Result state** — displays `ClaimResult` component:

```
Approved:
┌──────────────────────────────────────┐
│  ✓  Claim CLM-A3F9K2X8              │
│     Approved                         │
│                                      │
│  Approved amount: €1,800.00          │
│                                      │
│  Your trip cancellation claim has    │
│  been approved. The physician        │
│  statement confirms the illness      │
│  prevented travel...                 │
└──────────────────────────────────────┘

Rejected:
┌──────────────────────────────────────┐
│  ✗  Claim CLM-X1Y2Z3W4              │
│     Rejected                         │
│                                      │
│  Your claim has been rejected. The   │
│  cancellation date falls outside     │
│  the 90-day filing window...         │
└──────────────────────────────────────┘

Pending / Processing:
┌──────────────────────────────────────┐
│  ⏳  Claim CLM-A3F9K2X8             │
│     Being reviewed                   │
│                                      │
│  Your claim is being processed.      │
│  Please check back in a few minutes. │
└──────────────────────────────────────┘
```

No polling. Single fetch on form submit. User refreshes or resubmits the lookup form to check again.

---

### 5.8 Environment Variables

```bash
# .env.local

NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## 6. End-to-End Request Flow

```
1.  User fills form steps 1-2
2.  User reaches Step 3 (Documents)
    Frontend generates temp_claim_id = crypto.randomUUID()
3.  User uploads each document
    → uploadDocument(file, temp_claim_id, slot.id)
    → file stored at claim-documents/{temp_claim_id}/{slot.id}/{uuid}.pdf
    → returns { file_url, file_name }
    → stored in form state: attachments[slot.id] = { file_url, file_name }
4.  User reaches Step 4 (Review) and clicks Submit
    → attachments record converted to array:
      [{ document_type: 'physician_statement', file_url: '...', file_name: 'dr_note.pdf' }, ...]
    → POST /claims with full payload
5.  Backend (sync, ~50ms):
    → Validates ClaimCreateRequest with Pydantic
    → Generates claim_id (CLM-A3F9K2X8)
    → Inserts row into claim_case (status: pending)
    → Enqueues pipeline_service.process(case_id) via BackgroundTasks
    → Returns { claim_id: 'CLM-A3F9K2X8', status: 'pending' }
6.  Frontend:
    → Stores claim_id in sessionStorage
    → Redirects to /status?id=CLM-A3F9K2X8
7.  Backend (async, ~10-20s):
    → Updates status to 'processing'
    → Fetches PolicySchedule from mock adapter
    → Gets mock policy wording text for product_tier
    → Runs rule engine pre-checks
      → If violation: update status to 'rejected', stop
    → Calls assess_claim() — LangChain → Claude
    → Runs post-checks (coverage cap)
    → Updates claim_case with status, decision_summary, approved_amount
8.  User on /status page enters CLM-A3F9K2X8
    → GET /claims/CLM-A3F9K2X8
    → Returns { status: 'approved', decision_summary: '...', approved_amount: 1800 }
    → ClaimResult component displays decision
```

---

## 7. Out of Scope for POC

- Admin panel and human review queue
- Info request flow (needs_more_info treated as rejected)
- Email / SMS notifications
- Authentication for claimants
- Real insurer API integration
- Policy wording stored in database (hardcoded in mock adapter)
- Multiple insurers or claim types
- Pagination, filtering, or case history
- Rate limiting
- Document content verification (LLM reads document claims to be correct type)
