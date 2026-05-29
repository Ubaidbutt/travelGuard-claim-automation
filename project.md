# Project Overview
## AI-Powered Insurance Claims Handling System

**Version:** 2.1
**Last updated:** May 2026
**Changelog:** v2.1 — Removed Phase 4 Document Intelligence (document reading is now in v1). Renumbered phases. Updated "Why This Project Exists" section to reflect single LLM assessment. Fixed No LangChain design decision note.

---

## 1. What This Is

An AI-powered claims adjudication engine for travel insurance. A claimant submits a claim through a web form, the system retrieves their policy details from the insurer's systems, runs the claim through a multi-step LLM reasoning pipeline, applies hard business rules, and produces a structured decision — approved, rejected, needs more information, or referred to a human adjuster.

The product sits as an intelligent processing layer between an insurance company's existing systems and their claimants. It does not replace the insurer's database or policy engine — it adds an AI reasoning layer on top of what already exists.

---

## 2. The Problem Being Solved

Insurance claims handling today is slow, expensive, and inconsistent. A typical travel insurance claim takes 3-10 business days to resolve. Most of that time is a human adjuster reading a form, cross-referencing a policy document, and writing a response. The decision quality varies between adjusters, there is no structured reasoning trail, and the cost per claim is high.

The market already has large players addressing this (Shift Technology, Sprout.ai, Tractable) but they target large enterprise carriers with long implementation timelines and six-figure contracts. Mid-size and regional insurers have the same problem and no affordable solution.

The core insight is that most straightforward claims — especially trip cancellation — are highly rule-based. A well-designed LLM pipeline with a deterministic rule layer on top can handle the majority of cases automatically, routing only genuinely ambiguous cases to a human adjuster. Industry data shows AI-powered claims automation reduces resolution time by 75% and costs by 30-40%, with straight-through processing rates jumping from 10-15% to 70-90%.

---

## 3. Why This Project Exists (The Immediate Goal)

This was built to demonstrate AI/LLM engineering depth for an internal pitch at NN Group and as a portfolio piece for external AI engineering roles.

The key insight in scoping this project: the integration layer (SFTP adapters, SOAP wrappers, legacy system connectors) is interesting backend engineering but does not demonstrate AI skill. What does demonstrate AI engineering depth is:

- Designing a document-native LLM assessment where Claude reads the actual policy wording, extracts facts from uploaded proof documents, cross-references them against the claim form, and produces a structured decision with confidence and reasoning
- Understanding the separation between LLM reasoning (policy compliance, document analysis) and deterministic rule enforcement (facts like expiry dates and filing windows) — and knowing why that separation matters for compliance
- Understanding when not to trust the LLM — confidence thresholds, human-in-the-loop routing, hard rule overrides
- Structured output design with Pydantic validation — the LLM returns a typed JSON object, not free text
- A lightweight eval framework for measuring decision quality across defined scenarios
- The overall architecture: LLM for judgment, deterministic rules for compliance, human review for uncertainty

Everything in v1 is scoped to showcase these specifically. The mock adapter, the single claim type, the simple admin auth — these are deliberate simplifications so the AI layer gets the engineering attention it deserves.

---

## 4. Version 1 — What Is Built

### Scope

- **One claim type:** Trip cancellation only
- **One insurer:** NN Travel (mocked — returns realistic fake policy data)
- **One decision flow:** Submit → AI review → decision or info request
- **Two user types:** Claimant (no auth) and admin/adjuster (password protected)

### What v1 demonstrates

**Schema-driven form rendering** — the claim form is not hardcoded. It is driven by a JSON schema stored in the database. Adding a new claim type is a database insert, not a frontend code change. This is the right architectural decision for a product that needs to scale to multiple claim types.

**Document-native LLM reasoning** — Claude does not receive a pre-structured list of covered reasons extracted from the policy. It receives the actual policy wording document and reads it directly. This means Claude reasons about compliance the same way a human adjuster would — by reading the legal text — rather than checking against a hardcoded lookup table. It also extracts facts from uploaded proof documents, cross-references them against the form data, and flags any discrepancies. This is meaningfully more sophisticated than prompt engineering with structured data.

**Two-step integration pattern** — the adapter makes one external call to fetch the customer's policy schedule (their personal details, product tier, limits, claim history). The product tier from this response is then used to look up the correct policy wording document from internal storage. The wording that applies is the version that was in effect when the customer purchased their policy — not necessarily the latest. This pattern correctly models how insurance actually works and demonstrates understanding of the domain.

**Hard rule engine** — a deterministic layer that runs after the LLM. Expired policy, 90-day filing window, foreseeable event check, coverage cap. These cannot be overridden by the LLM. This is what makes the system defensible to regulators and auditors.

**Human-in-the-loop routing** — low-confidence decisions and high-fraud-risk cases route to a human adjuster queue automatically. The system knows its own limitations.

**Full audit trail** — every status transition is logged with a timestamp, who made the change, and why. The full LLM reasoning chain is stored per case. This is essential for compliance and dispute handling.

**Eval framework** — 20-30 test scenarios with expected outcomes that run the full pipeline. This separates engineers who have built with LLMs from those who have merely experimented.

### Architecture summary

```
Claimant (browser)
      ↓
  Next.js Frontend
      ↓
  FastAPI Backend
      ├── Case manager           Creates case + attachments, returns reference immediately
      │
      ├── Pipeline service       Runs asynchronously via BackgroundTasks
      │       │
      │       ├── Step 1: Adapter fetch
      │       │       └── Mock NN Travel adapter
      │       │               → returns PolicySchedule
      │       │                 (holder details, product tier, limits,
      │       │                  coverage dates, claim history)
      │       │
      │       ├── Step 2: Policy wording lookup
      │       │       └── PolicyWordingService
      │       │               → queries policy_wording table
      │       │               → uses product_tier + purchase_date from Step 1
      │       │               → returns extracted wording text
      │       │
      │       ├── Step 3: Rule engine pre-checks
      │       │       → expired policy, outside 90-day window,
      │       │         foreseeable event, net claim zero
      │       │       → hard rejections skip the LLM entirely
      │       │
      │       ├── Step 4: LLM assessment (Claude)
      │       │       → receives in one context:
      │       │           - Policy wording text (what is covered)
      │       │           - Policy schedule (customer's specific limits)
      │       │           - Claim form data (what claimant submitted)
      │       │           - Uploaded attachments (proof documents)
      │       │       → extracts facts from documents
      │       │       → cross-references against form data
      │       │       → checks policy compliance
      │       │       → returns structured decision
      │       │
      │       └── Step 5: Rule engine post-checks
      │               → coverage cap, low confidence → under_review
      │
      └── Case DB (Supabase)     Full audit trail, status history, decisions
```

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python 3.12, FastAPI 0.136, Pydantic v2 |
| LLM | Anthropic Claude (claude-sonnet-4-20250514) via official SDK |
| Database | Supabase (Postgres) |
| File storage | Supabase Storage |
| Background jobs | FastAPI BackgroundTasks |
| Frontend hosting | Vercel |
| Backend hosting | Railway |

---

## 5. The Roadmap — Taking It to the Next Level

Each phase below is a discrete increment that builds on the previous one. None require rewriting the existing system.

---

### Phase 2 — Real Integration Layer

**What changes:** Replace the mock adapter with real insurer API integrations, and build the admin portal for uploading policy wording documents.

The adapter interface (`InsurerAdapter.fetch()`) returns a `PolicySchedule` — the same contract as the mock. Adding a new insurer means writing a new adapter class that calls their API and maps the response to `PolicySchedule`. Nothing else in the pipeline changes.

The policy wording upload portal allows account managers to upload a new wording PDF for a given insurer and product tier, set its `effective_from` date, and have the system extract and store the text automatically.

**What to build:**
- Guidewire REST adapter (most common in European insurers)
- SOAP adapter base class for legacy systems
- SFTP file adapter for insurers with no API (reads nightly CSV/XML export, constructs PolicySchedule from it)
- Per-client credentials stored securely per adapter config
- Retry logic and circuit breakers for slow or flaky insurer APIs
- Admin portal page for uploading policy wording PDFs with effective date
- Automatic text extraction from uploaded PDFs on ingest

**Commercial value:** Each adapter you build for a real insurer is a barrier to entry for competitors. The policy wording management portal is what makes you sellable — insurers need to be able to update their own documents without filing a support ticket with you.

---

### Phase 3 — Additional Claim Types

**What changes:** Add medical emergency, baggage loss, and travel delay claim types.

The schema-driven form renderer means adding a new claim type is:
1. Insert a new row in `claim_form_schema` with the JSON field definition
2. Write a new prompt context for each LLM step (the steps themselves do not change)
3. Add claim-type-specific hard rules to the rule engine
4. Add eval scenarios for the new type

**What to build per claim type:**
- Form schema JSON with the right fields, validations, and document checklist
- Eligibility rules specific to that type (e.g. for medical: ICD code requirements, pre-existing condition check)
- Fraud indicators specific to that type
- Document requirements in the rule engine (e.g. for baggage: Property Irregularity Report required)

**Priority order:** Medical emergency (highest financial impact, most complex), baggage loss (most common, simplest), travel delay (simplest rules).

---

### Phase 4 — Proper Auth and Multi-Tenancy

**What changes:** Move from single-password admin access to proper auth. Support multiple insurers as clients with data isolation.

**What to build:**
- NextAuth.js or Auth0 for admin authentication (email/password or SSO)
- Role-based access: adjuster (view and action), manager (override and report), super admin (all)
- Claimant accounts — policy number + email verification instead of reference number as access token
- Row-level security in Supabase per `insurer_id` — clients can only see their own cases
- Per-client branding and form configuration via the `claim_form_schema` table

**Commercial significance:** Multi-tenancy is what transforms this from a demo into a product you can sell to multiple insurers simultaneously.

---

### Phase 5 — Async Job Queue and Production Infrastructure

**What changes:** Replace FastAPI `BackgroundTasks` with a proper job queue. Add observability.

**What to build:**
- Celery + Redis for job queue — jobs survive server restarts, retry on failure, and can be monitored
- Dead letter queue for failed jobs with alerting
- Structured logging (JSON format) per case and per pipeline step
- Sentry for error tracking
- Prometheus metrics: claims per hour, avg processing time, approval/rejection rates, LLM latency
- Rate limiting on public endpoints

**When needed:** When you have real clients and real volume. Not before.

---

### Phase 6 — Reporting and Analytics

**What changes:** Add a reporting layer for insurer clients.

**What to build:**
- Admin dashboard analytics: claim volume by type, status distribution, avg processing time, top rejection reasons, LLM confidence distribution
- Export to CSV for any filtered case list
- Scheduled weekly summary emails to insurer account managers
- Anomaly detection: flag unusual spikes in claims from a policy number or destination

---

### Phase 7 — Feedback Loop and Model Improvement

**What changes:** Use real claim outcomes to improve the LLM pipeline over time.

Every case where a human adjuster overrides the LLM decision is a training signal. Every case where the LLM said `needs_info` and the additional info made the decision obvious is a prompt improvement signal.

**What to build:**
- Human override tracking with structured reason codes (not just free text)
- Prompt iteration workflow: track which prompt version produced which decision, compare outcome distributions across versions
- A/B testing framework for prompt changes
- Regular eval re-runs to catch regressions when the model is updated

This phase is where the product becomes genuinely defensible — the more claims it processes, the better it gets, and the harder it is for a new entrant to match.

---

## 6. The Commercial Model

**Target customer:** Mid-size and regional insurance carriers who have manual claims processes and cannot afford enterprise vendors like Shift Technology.

**Pricing model:** Usage-based SaaS.
- Monthly platform fee — covers integration, support, white-labelling
- Per-claim processing fee — scales with volume, directly tied to ROI
- No upfront implementation cost — onboarding is the adapter build

**The pitch to insurers:** "We process straightforward claims automatically in seconds, route complex ones to your adjusters with a full reasoning summary, and give you an audit trail for every decision. You pay per claim processed. Your adjusters spend their time on cases that actually need human judgment."

**The moat:** The integration adapters. Every insurer runs different systems. Each adapter takes real engineering effort to build. Once you have five adapters and five clients, new competitors face the same integration work you already did — while you are already improving on live data.

---

## 7. Key Design Decisions and Why

**Document-native LLM reasoning instead of structured policy extraction** — the earlier design pre-extracted policy rules into structured Pydantic fields (covered_reasons as a list, max_claim_amount as a float). This approach requires manually maintaining that mapping per insurer and per tier, and loses the nuance of the actual policy language. Instead, Claude receives the policy wording document directly and reasons about compliance by reading it — the same way a human adjuster would. This is more accurate, more maintainable, and more impressive technically.

**Two-step adapter pattern** — the adapter makes one external call to fetch the customer's `PolicySchedule` (personal details, product tier, coverage dates, limits, claim history). The product tier and purchase date from this response are then used internally to look up the correct policy wording document. These are two separate concerns: external data about the customer, and internal management of policy wording documents. Mixing them in the adapter would couple your integration layer to your document storage, which is the wrong design.

**Policy wording stored internally, not fetched from insurer** — policy wording documents change infrequently (once or twice a year). Storing them in your own database and managing which version applies to which purchase date is simpler, faster, and does not require the insurer to expose wording documents via API. The `effective_from` / `effective_to` date range on each wording row ensures the correct version is always applied to a given claim.

**Trip cancellation only for v1** — the most rule-based claim type. Clean decision logic, manageable document set, realistic enough to demonstrate the full pipeline. Starting with medical claims would have added 4x complexity for no additional architectural insight.

**JSON schema config for forms** — not hardcoded React components. Adding a new claim type should not require a frontend deploy. This decision has zero implementation cost but demonstrates the right engineering instinct about configuration vs code.

**No LangChain** — the pipeline is explicit, readable Python. The orchestrator makes one well-structured Claude call, parses a typed Pydantic response, and the rule engine applies deterministic checks. An interviewer can read the code and understand exactly what the system does at every step. LangChain abstractions would have obscured this without adding anything meaningful for a fixed, non-agentic pipeline.

**Separate rule engine from LLM, with a clear boundary between them** — the rule engine checks facts (is the policy active? was the claim filed within 90 days?). The LLM checks policy compliance (is this reason covered? is the evidence sufficient?). These are deliberately different concerns. The rule engine does not encode anything about what the policy says — that would mean duplicating policy logic in code, which breaks every time an insurer updates their wording. And the LLM does not handle date arithmetic or status checks — those must be deterministic and auditable. In a regulated industry, an auditor must be able to read the rule engine and verify specific outcomes without needing to understand how the LLM works. This separation is what makes the system both intelligent and defensible.

**Supabase over raw Postgres** — built-in dashboard for browsing case data during demos, Storage for file uploads, PostgREST API that the Python SDK wraps cleanly. For a solo v1 build, the infrastructure simplification is worth more than the control SQLAlchemy would offer.
