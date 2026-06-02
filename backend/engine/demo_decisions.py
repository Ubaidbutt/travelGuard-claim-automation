from models.decision import ClaimDecision, DocumentExtraction, PolicyComplianceCheck

_DECISIONS: dict[str, ClaimDecision] = {
    "approval": ClaimDecision(
        document_extractions=[
            DocumentExtraction(
                document_type="physician_statement",
                extracted_facts={
                    "diagnosis": "acute appendicitis",
                    "admission_date": "confirmed",
                    "treating_physician": "Dr. K. Weber",
                    "fitness_to_travel": "not fit to travel",
                },
                matches_form_data=True,
                discrepancies=[],
            ),
            DocumentExtraction(
                document_type="booking_confirmation",
                extracted_facts={
                    "destination": "Italy",
                    "total_cost": "€3,200.00",
                    "cancellation_terms": "non-refundable",
                },
                matches_form_data=True,
                discrepancies=[],
            ),
        ],
        policy_compliance=PolicyComplianceCheck(
            reason_is_covered=True,
            evidence_sufficient=True,
            policy_conditions_met=True,
            compliance_notes=(
                "Claimant's sudden illness is a covered peril under Section 3.1 of the policy. "
                "Medical evidence confirms the condition prevented travel. "
                "Policy was active at the time of cancellation and all conditions are satisfied."
            ),
        ),
        decision="approved",
        confidence=0.94,
        approved_amount=3100.0,
        summary=(
            "Your claim has been approved. The medical documentation confirms a valid covered "
            "reason for cancellation, and all policy conditions have been met. "
            "A payout of €3,100.00 will be issued following standard processing."
        ),
        full_reasoning=(
            "Physician statement confirms acute appendicitis requiring hospitalisation. "
            "Illness qualifies as a covered peril under Section 3.1. Policy was active, "
            "claim filed within the 90-day window, and the event was not foreseeable at "
            "purchase. Net claim of €3,200 is within the €5,000 trip-cancellation limit. "
            "Approved amount of €3,100 reflects the €100 deductible on this policy tier."
        ),
    ),

    "wrong_documents": ClaimDecision(
        document_extractions=[
            DocumentExtraction(
                document_type="booking_confirmation",
                extracted_facts={
                    "destination": "Spain",
                    "total_cost": "€1,100.00",
                },
                matches_form_data=True,
                discrepancies=[],
            ),
        ],
        policy_compliance=PolicyComplianceCheck(
            reason_is_covered=True,
            evidence_sufficient=False,
            policy_conditions_met=False,
            compliance_notes=(
                "While illness is a covered peril under Section 3.1, the submitted documentation "
                "does not include the required physician statement confirming the diagnosis and "
                "fitness-to-travel assessment. A booking confirmation alone is insufficient to "
                "substantiate an illness-based claim. Policy Section 5.2 requires contemporaneous "
                "medical evidence from a licensed practitioner."
            ),
        ),
        decision="rejected",
        confidence=0.22,
        approved_amount=None,
        summary=(
            "Your claim has been rejected due to insufficient medical documentation. "
            "A physician statement confirming your diagnosis and inability to travel is required "
            "to process illness-related cancellation claims. Please contact "
            "support@travelguard.com to submit the required documents."
        ),
        full_reasoning=(
            "Claim reason (illness_claimant) is covered under Section 3.1 but the claimant "
            "submitted only a booking confirmation. No physician statement, medical certificate, "
            "or equivalent evidence was provided. Without medical evidence, it is not possible "
            "to verify the claimed illness or confirm the claimant was unfit to travel. "
            "Section 5.2 explicitly requires contemporaneous medical documentation. "
            "Confidence is low (0.22); claim is rejected for insufficient evidence."
        ),
    ),

    "needs_more_info": ClaimDecision(
        document_extractions=[
            DocumentExtraction(
                document_type="booking_confirmation",
                extracted_facts={
                    "destination": "Morocco",
                    "total_cost": "€2,850.00",
                    "booking_date": "confirmed",
                },
                matches_form_data=True,
                discrepancies=[],
            ),
        ],
        policy_compliance=PolicyComplianceCheck(
            reason_is_covered=True,
            evidence_sufficient=False,
            policy_conditions_met=True,
            compliance_notes=(
                "Family illness cancellation is a covered peril under Section 3.2 of the policy. "
                "However, the submitted documentation does not include medical evidence for the "
                "family member's condition, nor confirmation of the relationship to the claimant. "
                "The claimant's prior claim history (2 claims in the last 12 months) also warrants "
                "additional scrutiny before payment can be authorised."
            ),
        ),
        decision="needs_more_info",
        confidence=0.63,
        approved_amount=None,
        summary=(
            "Your claim requires additional documentation to proceed. "
            "Please provide a physician statement for the affected family member and "
            "proof of relationship. An adjuster will contact you within 2 business days "
            "to guide you through the next steps."
        ),
        full_reasoning=(
            "Family illness (illness_family) is covered under Section 3.2. Policy is active "
            "and the claim is filed within the 90-day window. However, no medical documentation "
            "for the family member was submitted and no proof of relationship is present. "
            "Prior claim history (2 claims in 12 months, total payouts €2,400) adds uncertainty. "
            "Confidence of 0.63 falls in the needs_more_info band (0.50–0.80); "
            "claim is referred for manual adjuster review."
        ),
    ),
}


def get_demo_decision(scenario: str) -> ClaimDecision:
    decision = _DECISIONS.get(scenario)
    if decision is None:
        raise ValueError(f"Unknown demo scenario: {scenario!r}")
    return decision
