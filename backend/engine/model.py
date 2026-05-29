import functools
from pathlib import Path

import anthropic
from config import settings
from models.claim import ClaimCase
from models.decision import ClaimDecision
from models.policy import PolicySchedule, PolicyWording

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
SYSTEM_PROMPT_PATH = PROMPT_DIR / "claim_assessment_system_prompt.txt"

_TOOL_NAME = "submit_claim_decision"
# Computed once at import time — pure Python, no I/O or external deps.
_TOOL_SCHEMA = ClaimDecision.model_json_schema()


class LLMAssessmentError(Exception):
    pass


@functools.cache
def _get_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(
        api_key=settings.anthropic_api_key,
        max_retries=3,
    )


@functools.cache
def _get_system_prompt() -> str:
    template = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()
    return template.format(
        approve_threshold=f"{settings.confidence_approve:.2f}",
        reject_threshold=f"{settings.confidence_reject:.2f}",
        approve_pct=int(settings.confidence_approve * 100),
    )


async def assess_claim(
    policy_wording: PolicyWording,
    policy_schedule: PolicySchedule,
    case: ClaimCase,
) -> ClaimDecision:
    """
    Single LLM call that receives all claim context and returns a structured
    ClaimDecision. Raises LLMAssessmentError on failure.
    """
    # System prompt is identical across all calls — mark cacheable.
    system = [
        {
            "type": "text",
            "text": _get_system_prompt(),
            "cache_control": {"type": "ephemeral"},
        }
    ]

    try:
        response = await _get_client().messages.create(
            model=settings.claude_model,
            max_tokens=16384,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": _user_content(policy_wording, policy_schedule, case),
                }
            ],
            tools=[
                {
                    "name": _TOOL_NAME,
                    "description": "Submit the structured claim assessment decision.",
                    "input_schema": _TOOL_SCHEMA,
                }
            ],
            tool_choice={"type": "tool", "name": _TOOL_NAME},
        )
        tool_block = next(b for b in response.content if b.type == "tool_use")
        return ClaimDecision.model_validate(tool_block.input)
    except Exception as e:
        raise LLMAssessmentError(f"LLM call failed: {e}") from e


def _user_content(
    policy_wording: PolicyWording,
    policy_schedule: PolicySchedule,
    case: ClaimCase,
) -> list[dict]:
    content: list[dict] = []

    # 1. Policy wording — cache_control marks this block as cacheable.
    # The wording is identical for every claim under the same insurer/tier,
    # so subsequent claims hit the cache and skip re-processing these tokens.
    content.append({
        "type": "text",
        "text": (
            f"## POLICY WORDING\n"
            f"Insurer: {policy_wording.insurer_id}\n"
            f"Tier: {policy_wording.product_tier} | Version: {policy_wording.version}\n\n"
            f"{policy_wording.extracted_text}"
        ),
        "cache_control": {"type": "ephemeral"},
    })

    # 2. Customer policy schedule
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

    # 3. Claim form data — user-controlled text fields are wrapped in XML
    # delimiters so the model can distinguish untrusted input from instructions.
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

    # 4. Uploaded documents
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

    # 5. Final instruction
    content.append({
        "type": "text",
        "text": (
            "Provide your structured assessment. Base every conclusion on "
            "explicit evidence from the documents or policy wording text above."
        ),
    })

    return content
