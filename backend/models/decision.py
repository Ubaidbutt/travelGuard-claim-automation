from pydantic import BaseModel
from typing import Literal


class DocumentExtraction(BaseModel):
    document_type: str
    extracted_facts: dict[str, str]
    matches_form_data: bool
    discrepancies: list[str]


class PolicyComplianceCheck(BaseModel):
    reason_is_covered: bool
    evidence_sufficient: bool
    policy_conditions_met: bool
    compliance_notes: str


class ClaimDecision(BaseModel):
    """
    Structured output schema returned by Claude via .with_structured_output().
    LangChain validates and parses this automatically — no manual JSON parsing.
    """
    document_extractions: list[DocumentExtraction]
    policy_compliance: PolicyComplianceCheck
    decision: Literal["approved", "rejected", "needs_more_info"]
    confidence: float  # 0.0 to 1.0
    approved_amount: float | None  # set only when decision is approved
    summary: str       # 2-3 sentence plain-text explanation for the claimant
    full_reasoning: str  # detailed reasoning stored for internal use
