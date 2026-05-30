from fastapi import APIRouter, BackgroundTasks, HTTPException
from models.claim import ClaimCreateRequest, ClaimCreateResponse, ClaimStatusResponse
from services import claim_service, pipeline_service
from db.client import get_db

router = APIRouter(prefix="/claims", tags=["claims"])


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
