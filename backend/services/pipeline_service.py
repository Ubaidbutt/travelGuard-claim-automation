from config import settings
from db.client import get_db
from adapters.router import get_adapter
from adapters.mock_nn_travel import get_mock_wording, PolicyNotFoundError
from engine.model import analyse_evidence, assess_claim, LLMAssessmentError
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
        policy_wording = get_mock_wording()

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

        # 5a. Pass 1 — Evidence Analyst: extract facts from documents, flag issues
        evidence, evidence_usage = await analyse_evidence(
            policy_schedule=policy_schedule,
            case=case,
        )

        print(f"Evidence analysis completed: quality={evidence.evidence_quality}, "
              f"fraud_signals={len(evidence.fraud_signals)}, "
              f"missing_docs={len(evidence.missing_expected_documents)}")

        # Write Pass 1 results immediately so they're preserved even if Pass 2 fails
        db.table("claim_llm_passes").insert({
            "claim_id": case.claim_id,
            "pass1_model": settings.claude_evidence_model,
            "pass1_output": evidence.model_dump(),
            "pass1_input_tokens": evidence_usage["input_tokens"],
            "pass1_output_tokens": evidence_usage["output_tokens"],
            "pass1_cache_read_tokens": evidence_usage["cache_read_tokens"],
        }).execute()

        # 5b. Pass 2 — Policy Adjudicator: apply policy to the structured evidence report
        llm_result, decision_usage = await assess_claim(
            policy_wording=policy_wording,
            policy_schedule=policy_schedule,
            case=case,
            evidence=evidence,
        )

        print("LLM assessment completed with decision:", llm_result.decision)

        # 6. Post-checks — apply confidence thresholds and coverage cap
        llm_result = post_check(llm_result, policy_schedule)

        # Add Pass 2 results to the existing row
        db.table("claim_llm_passes").update({
            "pass2_model": settings.claude_model,
            "pass2_output": llm_result.model_dump(),
            "pass2_input_tokens": decision_usage["input_tokens"],
            "pass2_output_tokens": decision_usage["output_tokens"],
            "pass2_cache_read_tokens": decision_usage["cache_read_tokens"],
        }).eq("claim_id", case.claim_id).execute()

        # 7. Persist decision, summary, approved amount, and full audit detail
        assessment_detail = {
            "evidence_report": evidence.model_dump(),
            "document_extractions": [e.model_dump() for e in evidence.document_extractions],
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
        print(f"LLM assessment error for case {case_id}: {e}")
        await update_decision(
            db,
            case_id,
            status="failed",
            summary="Something went wrong while processing your claim. Please check back later.",
            approved_amount=None,
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
