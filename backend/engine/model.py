import functools
from pathlib import Path

import anthropic
from config import settings
from models.claim import ClaimCase
from models.decision import ClaimDecision, EvidenceReport
from models.policy import PolicySchedule, PolicyWording

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
SYSTEM_PROMPT_PATH = PROMPT_DIR / "claim_assessment_system_prompt.txt"
EVIDENCE_PROMPT_PATH = PROMPT_DIR / "evidence_analyst_system_prompt.txt"

_EVIDENCE_TOOL_NAME = "submit_evidence_report"
_DECISION_TOOL_NAME = "submit_claim_decision"

_EVIDENCE_TOOL_SCHEMA = EvidenceReport.model_json_schema()
_DECISION_TOOL_SCHEMA = ClaimDecision.model_json_schema()


class LLMAssessmentError(Exception):
    pass


@functools.cache
def _get_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        max_retries=3,
    )


@functools.cache
def _get_evidence_system_prompt() -> str:
    return EVIDENCE_PROMPT_PATH.read_text(encoding="utf-8").strip()


@functools.cache
def _get_adjudicator_system_prompt() -> str:
    template = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()
    return template.format(
        approve_threshold=f"{settings.confidence_approve:.2f}",
        reject_threshold=f"{settings.confidence_reject:.2f}",
        approve_pct=int(settings.confidence_approve * 100),
    )


async def analyse_evidence(
    policy_schedule: PolicySchedule,
    case: ClaimCase,
) -> tuple[EvidenceReport, dict]:
    """
    Pass 1 — Evidence Analyst. Reads all uploaded documents and the claim form,
    extracts facts, cross-references, flags gaps and fraud signals, and produces
    a structured EvidenceReport. Does not access policy wording or make coverage decisions.
    Returns (EvidenceReport, usage) where usage contains token counts.
    """
    system = [
        {
            "type": "text",
            "text": _get_evidence_system_prompt(),
            "cache_control": {"type": "ephemeral"},
        }
    ]

    try:
        response = await _get_client().messages.create(
            model=settings.claude_evidence_model,
            max_tokens=4096,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": _evidence_content(policy_schedule, case),
                }
            ],
            tools=[
                {
                    "name": _EVIDENCE_TOOL_NAME,
                    "description": "Submit the structured evidence analysis report.",
                    "input_schema": _EVIDENCE_TOOL_SCHEMA,
                }
            ],
            tool_choice={"type": "tool", "name": _EVIDENCE_TOOL_NAME},
        )
        tool_block = next(b for b in response.content if b.type == "tool_use")
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "cache_read_tokens": getattr(response.usage, "cache_read_input_tokens", 0) or 0,
        }
        return EvidenceReport.model_validate(tool_block.input), usage
    except Exception as e:
        raise LLMAssessmentError(f"Evidence analysis failed: {e}") from e


async def assess_claim(
    policy_wording: PolicyWording,
    policy_schedule: PolicySchedule,
    case: ClaimCase,
    evidence: EvidenceReport,
) -> tuple[ClaimDecision, dict]:
    """
    Pass 2 — Policy Adjudicator. Receives the structured EvidenceReport from Pass 1
    along with policy wording and schedule. Makes the coverage decision without
    re-reading raw documents.
    Returns (ClaimDecision, usage) where usage contains token counts.
    """
    system = [
        {
            "type": "text",
            "text": _get_adjudicator_system_prompt(),
            "cache_control": {"type": "ephemeral"},
        }
    ]

    try:
        response = await _get_client().messages.create(
            model=settings.claude_model,
            max_tokens=8192,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": _adjudicator_content(policy_wording, policy_schedule, case, evidence),
                }
            ],
            tools=[
                {
                    "name": _DECISION_TOOL_NAME,
                    "description": "Submit the structured claim assessment decision.",
                    "input_schema": _DECISION_TOOL_SCHEMA,
                }
            ],
            tool_choice={"type": "tool", "name": _DECISION_TOOL_NAME},
        )
        tool_block = next(b for b in response.content if b.type == "tool_use")
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "cache_read_tokens": getattr(response.usage, "cache_read_input_tokens", 0) or 0,
        }
        return ClaimDecision.model_validate(tool_block.input), usage
    except Exception as e:
        raise LLMAssessmentError(f"Claim adjudication failed: {e}") from e


def _evidence_content(policy_schedule: PolicySchedule, case: ClaimCase) -> list[dict]:
    """User message for Pass 1: schedule + claim form + document files (no policy wording)."""
    content: list[dict] = []

    # Policy schedule — gives the analyst context about dates and the holder identity
    # so they can verify names and coverage period against the documents.
    limits_text = "\n".join(
        f"  {l.benefit}: €{l.limit:,.2f} (deductible €{l.deductible:,.2f})"
        for l in policy_schedule.coverage_limits
    )
    content.append({
        "type": "text",
        "text": (
            f"## CUSTOMER POLICY SCHEDULE\n"
            f"Policy: {policy_schedule.policy_number} | "
            f"Tier: {policy_schedule.product_tier} | "
            f"Status: {policy_schedule.status}\n"
            f"Purchase date: {policy_schedule.purchase_date} | "
            f"Coverage: {policy_schedule.coverage_start} to {policy_schedule.coverage_end}\n"
            f"Holder: {policy_schedule.holder.full_name} "
            f"(DOB: {policy_schedule.holder.date_of_birth})\n\n"
            f"Coverage limits:\n{limits_text}"
        ),
    })

    # Claim form data
    net = case.total_cost - case.already_refunded
    content.append({
        "type": "text",
        "text": (
            f"## CLAIM SUBMISSION\n"
            f"Claimant: <claimant_name>{case.full_name}</claimant_name> "
            f"| Email: {case.email}\n"
            f"Cancellation reason: {case.cancellation_reason}\n"
            f"Departure: {case.departure_date} | Return: {case.return_date}\n"
            f"Destination: {case.destination_country}\n"
            f"Booking reference: <booking_reference>{case.booking_reference}</booking_reference>\n"
            f"Cancellation date: {case.cancellation_date}\n"
            f"Date aware of reason: {case.aware_of_reason_date}\n"
            f"Total trip cost: €{case.total_cost:,.2f}\n"
            f"Already refunded: €{case.already_refunded:,.2f}\n"
            f"Net claim: €{net:,.2f}\n\n"
            f"Description:\n"
            f"<claimant_description>\n{case.description}\n</claimant_description>"
        ),
    })

    # Document files
    if case.attachments:
        content.append({
            "type": "text",
            "text": f"## PROOF DOCUMENTS ({len(case.attachments)} uploaded)",
        })
        for att in case.attachments:
            content.append({
                "type": "text",
                "text": (
                    f"### {att.document_type.replace('_', ' ').title()}\n"
                    f"File: {att.file_name}"
                ),
            })
            ext = att.file_name.rsplit(".", 1)[-1].lower()
            if ext in ("jpg", "jpeg", "png", "gif", "webp"):
                content.append({
                    "type": "image",
                    "source": {"type": "url", "url": att.file_url},
                })
            else:
                content.append({
                    "type": "document",
                    "source": {"type": "url", "url": att.file_url},
                })
    else:
        content.append({
            "type": "text",
            "text": "## PROOF DOCUMENTS\nNo documents uploaded.",
        })

    content.append({
        "type": "text",
        "text": "Analyse all submitted documents against the claim form data above. Extract facts, identify mismatches, and produce your evidence report.",
    })

    return content


def _adjudicator_content(
    policy_wording: PolicyWording,
    policy_schedule: PolicySchedule,
    case: ClaimCase,
    evidence: EvidenceReport,
) -> list[dict]:
    """User message for Pass 2: policy wording (cached) + schedule + claim form + EvidenceReport."""
    content: list[dict] = []

    # Policy wording — cached; identical for all claims on the same insurer/tier.
    content.append({
        "type": "text",
        "text": (
            f"## POLICY WORDING\n"
            f"Insurer: {policy_wording.insurer_id}\n"
            f"Version: {policy_wording.version}\n\n"
            f"{policy_wording.extracted_text}"
        ),
        "cache_control": {"type": "ephemeral"},
    })

    # Customer policy schedule
    limits_text = "\n".join(
        f"  {l.benefit}: €{l.limit:,.2f} (deductible €{l.deductible:,.2f})"
        for l in policy_schedule.coverage_limits
    )
    content.append({
        "type": "text",
        "text": (
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
        ),
    })

    # Claim form data
    net = case.total_cost - case.already_refunded
    content.append({
        "type": "text",
        "text": (
            f"## CLAIM SUBMISSION\n"
            f"Claimant: <claimant_name>{case.full_name}</claimant_name> "
            f"| Email: {case.email}\n"
            f"Cancellation reason: {case.cancellation_reason}\n"
            f"Departure: {case.departure_date} | Return: {case.return_date}\n"
            f"Destination: {case.destination_country}\n"
            f"Booking reference: <booking_reference>{case.booking_reference}</booking_reference>\n"
            f"Cancellation date: {case.cancellation_date}\n"
            f"Date aware of reason: {case.aware_of_reason_date}\n"
            f"Total trip cost: €{case.total_cost:,.2f}\n"
            f"Already refunded: €{case.already_refunded:,.2f}\n"
            f"Net claim: €{net:,.2f}\n\n"
            f"Description:\n"
            f"<claimant_description>\n{case.description}\n</claimant_description>"
        ),
    })

    # Evidence Report from Pass 1 — structured briefing, no raw document files
    discrepancies_text = (
        "\n".join(f"  - {d}" for d in evidence.cross_document_discrepancies)
        or "  None identified"
    )
    missing_text = (
        "\n".join(f"  - {d}" for d in evidence.missing_expected_documents)
        or "  None"
    )
    fraud_text = (
        "\n".join(f"  - {s}" for s in evidence.fraud_signals)
        or "  None identified"
    )
    content.append({
        "type": "text",
        "text": (
            f"## EVIDENCE REPORT (pre-analysed by evidence examiner)\n\n"
            f"Evidence quality: {evidence.evidence_quality.upper()}\n\n"
            f"Cross-document discrepancies:\n{discrepancies_text}\n\n"
            f"Missing expected documents:\n{missing_text}\n\n"
            f"Fraud signals:\n{fraud_text}\n\n"
            f"Evidence narrative:\n{evidence.evidence_narrative}"
        ),
    })

    content.append({
        "type": "text",
        "text": (
            "Apply the policy wording to the evidence above and provide your adjudication decision. "
            "Base every conclusion on explicit policy clauses and the evidence report findings."
        ),
    })

    return content
