import logging
from dataclasses import dataclass
from datetime import date

from config import settings
from models.claim import ClaimCase
from models.decision import ClaimDecision
from models.policy import PolicySchedule

logger = logging.getLogger(__name__)


@dataclass
class RuleViolation:
    rule: str
    reason: str


def pre_check(case: ClaimCase, policy: PolicySchedule) -> RuleViolation | None:
    """
    Runs before the LLM. Returns a RuleViolation if the claim should be
    rejected outright without calling Claude. Returns None if all checks pass.
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
    days = (date.today() - case.cancellation_date).days
    if days > 90:
        return RuleViolation(
            rule="outside_filing_window",
            reason=(
                f"Claim filed {days} days after the cancellation date. "
                "Claims must be filed within 90 days of cancellation."
            ),
        )

    # 3. Claimant must not have known about the reason before purchasing the policy
    if case.aware_of_reason_date < policy.purchase_date:
        return RuleViolation(
            rule="foreseeable_event",
            reason=(
                f"Claimant became aware of the cancellation reason on "
                f"{case.aware_of_reason_date}, before the policy was purchased on "
                f"{policy.purchase_date}. Pre-existing known events are not covered."
            ),
        )

    # 4. Net claim must be positive after refunds
    net = case.total_cost - case.already_refunded
    if net <= 0:
        return RuleViolation(
            rule="net_claim_zero",
            reason=(
                f"Net claim is €{net:.2f} after accounting for refunds already received. "
                "Nothing to reimburse."
            ),
        )

    return None


def post_check(decision: ClaimDecision, policy: PolicySchedule) -> ClaimDecision:
    """
    Applies hard limits to the LLM output. Returns the (possibly modified) decision.
    - Enforces confidence thresholds from config (approve >= confidence_approve,
      reject < confidence_reject, else needs_more_info).
    - Caps approved_amount at the policy's trip_cancellation limit.
    - Logs and records any decision override so reviewers can see it.
    """
    original = decision.decision

    if decision.confidence >= settings.confidence_approve:
        decision.decision = "approved"
    elif decision.confidence < settings.confidence_reject:
        decision.decision = "rejected"
        decision.approved_amount = None
    else:
        decision.decision = "needs_more_info"
        decision.approved_amount = None

    if decision.decision != original:
        note = (
            f"[post_check override] Model returned '{original}' but confidence "
            f"{decision.confidence:.2f} maps to '{decision.decision}' under current "
            f"thresholds (approve≥{settings.confidence_approve}, "
            f"reject<{settings.confidence_reject})."
        )
        logger.warning(note)
        decision.full_reasoning += f"\n\n{note}"

    if decision.decision == "approved" and decision.approved_amount:
        limit = next(
            (
                l.limit
                for l in policy.coverage_limits
                if l.benefit == "trip_cancellation"
            ),
            None,
        )
        if limit and decision.approved_amount > limit:
            decision.approved_amount = limit
            decision.summary += (
                f" Approved amount capped at policy limit of €{limit:,.2f}."
            )

    return decision
