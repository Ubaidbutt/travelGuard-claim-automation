from pydantic import BaseModel
from datetime import date


class PolicyHolder(BaseModel):
    full_name: str
    date_of_birth: date
    email: str


class CoverageLimit(BaseModel):
    benefit: str
    limit: float
    deductible: float


class ClaimHistory(BaseModel):
    total_claims: int
    claims_last_12_months: int
    prior_payouts_total: float


class PolicySchedule(BaseModel):
    policy_number: str
    insurer_id: str
    product_tier: str  # 'basic' | 'classic' | 'premium'
    status: str        # 'active' | 'expired' | 'suspended'
    purchase_date: date
    coverage_start: date
    coverage_end: date
    holder: PolicyHolder
    coverage_limits: list[CoverageLimit]
    add_ons: list[str]
    claim_history: ClaimHistory


class PolicyWording(BaseModel):
    insurer_id: str
    product_tier: str
    version: str
    extracted_text: str  # full wording text passed to Claude
