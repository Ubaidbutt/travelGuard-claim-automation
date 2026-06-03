from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from models.claim import ClaimCreateRequest, ClaimCreateResponse, ClaimStatusResponse, DemoClaimRequest, PolicyValidateRequest
from services import claim_service, pipeline_service
from adapters.router import get_adapter
from adapters.mock_nn_travel import PolicyNotFoundError
from db.client import get_db
from engine.demo_profiles import build_demo_payload
from utils.rate_limit import GlobalDailyCounter, IPRateLimiter
from config import settings

router = APIRouter(prefix="/claims", tags=["claims"])

_demo_ip_limiter = IPRateLimiter(
    max_requests=settings.demo_rate_limit,
    window_minutes=60,
)
_demo_daily_counter = GlobalDailyCounter(max_per_day=settings.demo_daily_cap)


@router.post("/demo", status_code=201, response_model=ClaimCreateResponse)
async def submit_demo_claim(
    body: DemoClaimRequest,
    background_tasks: BackgroundTasks,
    request: Request,
) -> ClaimCreateResponse:
    _demo_daily_counter.check()
    _demo_ip_limiter.check(request)
    payload = build_demo_payload(body.profile_id)
    db = get_db()
    case = await claim_service.create(db, payload)
    background_tasks.add_task(pipeline_service.process, case["id"])
    return ClaimCreateResponse(claim_id=case["claim_id"], status="pending")


@router.post("", status_code=201, response_model=ClaimCreateResponse)
async def create_claim(
    payload: ClaimCreateRequest,
    background_tasks: BackgroundTasks,
):
    db = get_db()

    # Create the case in DB — returns immediately with claim_id
    case = await claim_service.create(db, payload)

    # Trigger pipeline in background — does not block the response
    background_tasks.add_task(pipeline_service.process, case["id"])

    return ClaimCreateResponse(claim_id=case["claim_id"], status="pending")


@router.get("/{claim_id}", response_model=ClaimStatusResponse)
async def get_claim(claim_id: str):
    db = get_db()
    case = await claim_service.get_by_claim_id(db, claim_id)
    if not case:
        raise HTTPException(
            status_code=404,
            detail=f"No claim found with ID '{claim_id}'. Please check your reference number and try again.",
        )
    return ClaimStatusResponse(**case)


@router.post("/validate-policy", status_code=200)
async def validate_policy(payload: PolicyValidateRequest):
    adapter = get_adapter("nn_travel")
    try:
        policy = await adapter.fetch(payload.policy_number)
    except PolicyNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="No policy found with that policy number. Please check and try again.",
        )

    email_match = policy.holder.email.lower() == str(payload.email).lower()
    dob_match = policy.holder.date_of_birth == payload.date_of_birth
    if not email_match or not dob_match:
        raise HTTPException(
            status_code=422,
            detail="The details you entered do not match our records for this policy.",
        )

    return {"valid": True}
