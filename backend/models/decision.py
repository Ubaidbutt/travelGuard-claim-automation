from pydantic import BaseModel, Field
from typing import Literal


class DocumentExtraction(BaseModel):
    document_type: str
    extracted_facts: dict[str, str]
    matches_form_data: bool
    discrepancies: list[str]


class EvidenceReport(BaseModel):
    """Output of Pass 1 — Evidence Analyst. Structured briefing passed to the adjudicator."""
    document_extractions: list[DocumentExtraction]
    cross_document_discrepancies: list[str]
    missing_expected_documents: list[str]
    fraud_signals: list[str]
    evidence_quality: Literal["strong", "adequate", "weak", "insufficient"]
    evidence_narrative: str


class PolicyComplianceCheck(BaseModel):
    reason_is_covered: bool
    evidence_sufficient: bool
    policy_conditions_met: bool
    compliance_notes: str


class ClaimDecision(BaseModel):
    """Output of Pass 2 — Policy Adjudicator."""
    document_extractions: list[DocumentExtraction] = Field(default_factory=list)
    policy_compliance: PolicyComplianceCheck
    decision: Literal["approved", "rejected", "needs_more_info"]
    confidence: float  # 0.0 to 1.0
    approved_amount: float | None  # set only when decision is approved
    summary: str       # 2-3 sentence plain-text explanation for the claimant
    full_reasoning: str  # detailed reasoning stored for internal use
