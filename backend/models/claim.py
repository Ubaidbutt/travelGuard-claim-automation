from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import date
from decimal import Decimal
from typing import Literal


CancellationReason = Literal[
    "illness_claimant",
    "illness_family",
    "death_family",
    "natural_disaster",
    "carrier_bankruptcy",
    "home_uninhabitable",
    "jury_duty",
    "job_loss",
    "travel_advisory",
]

DocumentType = Literal[
    "booking_confirmation",
    "payment_proof",
    "physician_statement",
    "death_certificate",
    "redundancy_letter",
    "official_report",
    "travel_advisory_copy",
    "cancellation_proof",
    "other",
]


class AttachmentInput(BaseModel):
    document_type: DocumentType
    file_url: str
    file_name: str


class ClaimCreateRequest(BaseModel):
    # Personal details
    full_name: str
    email: EmailStr
    phone: str
    policy_number: str

    # Insurance details
    departure_date: date
    return_date: date
    destination_country: str
    booking_reference: str
    cancellation_reason: CancellationReason
    cancellation_date: date
    aware_of_reason_date: date
    total_cost: Decimal
    already_refunded: Decimal = Decimal("0")
    description: str

    # Attachments — uploaded to Supabase Storage by frontend before this call
    attachments: list[AttachmentInput] = []


class ClaimCase(BaseModel):
    """Full claim record as returned from the database."""

    id: str
    claim_id: str
    full_name: str
    email: str
    phone: str
    policy_number: str
    departure_date: date
    return_date: date
    destination_country: str
    booking_reference: str
    cancellation_reason: CancellationReason
    cancellation_date: date
    aware_of_reason_date: date
    total_cost: float
    already_refunded: float
    description: str
    attachments: list[AttachmentInput] = Field(default_factory=list)
    status: str

    @field_validator("attachments", mode="before")
    @classmethod
    def _coerce_null_attachments(cls, v: object) -> object:
        return v if v is not None else []

    model_config = {"extra": "ignore"}


class ClaimCreateResponse(BaseModel):
    claim_id: str
    status: str


class ClaimStatusResponse(BaseModel):
    claim_id: str
    status: str
    decision_summary: str | None
    approved_amount: float | None
    created_at: str
    updated_at: str
