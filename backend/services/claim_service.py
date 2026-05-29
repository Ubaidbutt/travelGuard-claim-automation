import random
import string
from datetime import datetime, timezone
from supabase import Client
from models.claim import ClaimCreateRequest


def _generate_claim_id() -> str:
    chars = string.ascii_uppercase + string.digits
    return "CLM-" + "".join(random.choices(chars, k=8))


async def create(db: Client, payload: ClaimCreateRequest) -> dict:
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


async def get_by_claim_id(db: Client, claim_id: str) -> dict | None:
    result = (
        db.table("claim_case")
        .select("claim_id, status, decision_summary, approved_amount, created_at, updated_at")
        .eq("claim_id", claim_id)
        .maybe_single()
        .execute()
    )
    return result.data


async def get_full_by_id(db: Client, case_id: str) -> dict | None:
    result = (
        db.table("claim_case")
        .select("*")
        .eq("id", case_id)
        .maybe_single()
        .execute()
    )
    return result.data


async def update_decision(
    db: Client,
    case_id: str,
    status: str,
    summary: str,
    approved_amount: float | None,
    assessment_detail: dict | None = None,
) -> None:
    data: dict = {
        "status": status,
        "decision_summary": summary,
        "approved_amount": approved_amount,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if assessment_detail is not None:
        data["assessment_detail"] = assessment_detail
    db.table("claim_case").update(data).eq("id", case_id).execute()
