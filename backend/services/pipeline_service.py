from db.client import get_db
from adapters.router import get_adapter
from adapters.mock_nn_travel import get_mock_wording, PolicyNotFoundError
from engine.model import assess_claim, LLMAssessmentError
from engine.rule_engine import pre_check, post_check
from services.claim_service import get_full_by_id, update_decision
from models.claim import ClaimCase


async def process(case_id: str) -> None:
    db = get_db()

    # Mark as processing immediately so the status page shows progress
    db.table("claim_case").update({"status": "processing"}).eq("id", case_id).execute()

    try:
        # 1. Fetch full case from DB and parse into typed model
        raw = await get_full_by_id(db, case_id)
        if not raw:
            raise RuntimeError(f"Case {case_id} not found after insert")
        case = ClaimCase.model_validate(raw)

        # 2. Fetch policy schedule from mock adapter
        adapter = get_adapter("nn_travel")
        policy_schedule = await adapter.fetch(case.policy_number)

        print(f"Processing case {case_id} for policy {case.policy_number} with tier {policy_schedule.product_tier}")

        # 3. Fetch policy wording for this tier
        policy_wording = get_mock_wording(policy_schedule.product_tier)

        # 4. Rule engine pre-checks — skip LLM if a hard rejection applies
        violation = pre_check(case, policy_schedule)
        if violation:
            await update_decision(
                db,
                case_id,
                status="rejected",
                summary=violation.reason,
                approved_amount=None,
            )
            return

        # 5. LLM assessment
        llm_result = await assess_claim(
            policy_wording=policy_wording,
            policy_schedule=policy_schedule,
            case=case,
        )

        print("LLM assessment completed with decision:", llm_result.decision)

        # 6. Post-checks — apply confidence thresholds and coverage cap
        llm_result = post_check(llm_result, policy_schedule)

        # 7. Persist decision, summary, approved amount, and full audit detail
        assessment_detail = {
            "document_extractions": [e.model_dump() for e in llm_result.document_extractions],
            "policy_compliance": llm_result.policy_compliance.model_dump(),
            "full_reasoning": llm_result.full_reasoning,
            "confidence": llm_result.confidence,
        }

        await update_decision(
            db,
            case_id,
            status=llm_result.decision,
            summary=llm_result.summary,
            approved_amount=llm_result.approved_amount,
            assessment_detail=assessment_detail,
        )

    except PolicyNotFoundError as e:
        await update_decision(
            db, case_id, status="rejected", summary=str(e), approved_amount=None
        )
    except LLMAssessmentError as e:
        await update_decision(
            db, case_id, status="failed", summary=str(e), approved_amount=None
        )
    except Exception as e:
        await update_decision(
            db,
            case_id,
            status="failed",
            summary="An unexpected error occurred while processing your claim.",
            approved_amount=None,
        )
        raise
