from datetime import date, timedelta
from decimal import Decimal

from models.claim import AttachmentInput, ClaimCreateRequest, DemoProfileId

_BASE = "https://lzcmhzwdledddqfsrkkv.supabase.co/storage/v1/object/public/claim-documents"


def build_demo_payload(profile_id: DemoProfileId) -> ClaimCreateRequest:
    today = date.today()
    departure = today + timedelta(days=30)
    return_d = today + timedelta(days=40)
    cancellation = today - timedelta(days=7)
    aware_of = today - timedelta(days=7)

    profiles: dict[DemoProfileId, ClaimCreateRequest] = {
        "approval": ClaimCreateRequest(
            full_name="Sarah Müller",
            email="sarah@example.com",
            phone="+49 89 12345678",
            policy_number="POL-7823419",
            departure_date=departure,
            return_date=return_d,
            destination_country="Italy",
            booking_reference="BK-DEMO-001",
            cancellation_reason="illness_claimant",
            cancellation_date=cancellation,
            aware_of_reason_date=aware_of,
            total_cost=Decimal("3200"),
            already_refunded=Decimal("0"),
            description=(
                "I was admitted to Munich General Hospital with acute appendicitis seven days "
                "before my scheduled departure. My surgeon, Dr. Klaus Weber, performed an "
                "emergency appendectomy and issued a medical certificate confirming I am unfit "
                "to travel for six weeks. The trip is entirely non-refundable. I have attached "
                "the physician statement, booking confirmation, and cancellation proof."
            ),
            attachments=[
                AttachmentInput(
                    document_type="physician_statement",
                    file_url=f"{_BASE}/demo/approval/physician_statement.pdf",
                    file_name="physician_statement.pdf",
                ),
                AttachmentInput(
                    document_type="booking_confirmation",
                    file_url=f"{_BASE}/demo/approval/booking_confirmation.pdf",
                    file_name="booking_confirmation.pdf",
                ),
                AttachmentInput(
                    document_type="cancellation_proof",
                    file_url=f"{_BASE}/demo/approval/cancellation_proof.pdf",
                    file_name="cancellation_proof.pdf",
                ),
            ],
        ),
        "expired_policy": ClaimCreateRequest(
            full_name="Jan de Vries",
            email="jan@example.com",
            phone="+31 20 9876543",
            policy_number="POL-3156082",
            departure_date=departure,
            return_date=return_d,
            destination_country="France",
            booking_reference="BK-DEMO-002",
            cancellation_reason="illness_claimant",
            cancellation_date=cancellation,
            aware_of_reason_date=aware_of,
            total_cost=Decimal("1200"),
            already_refunded=Decimal("0"),
            description=(
                "I fell ill before my planned trip to Paris and was advised by my doctor not "
                "to travel. I am filing this claim to recover my non-refundable booking costs "
                "of EUR 1,200."
            ),
            attachments=[
                AttachmentInput(
                    document_type="booking_confirmation",
                    file_url=f"{_BASE}/demo/expired_policy/booking_confirmation.pdf",
                    file_name="booking_confirmation.pdf",
                ),
            ],
        ),
        "wrong_documents": ClaimCreateRequest(
            full_name="Pieter van Dam",
            email="pieter@example.com",
            phone="+31 70 5554433",
            policy_number="POL-4512896",
            departure_date=departure,
            return_date=return_d,
            destination_country="Spain",
            booking_reference="BK-DEMO-003",
            cancellation_reason="illness_claimant",
            cancellation_date=cancellation,
            aware_of_reason_date=aware_of,
            total_cost=Decimal("1100"),
            already_refunded=Decimal("0"),
            description=(
                "I had to cancel my trip to Spain due to illness. I have attached my booking "
                "confirmation and a pharmacy receipt showing I purchased medication around the "
                "time of cancellation."
            ),
            attachments=[
                AttachmentInput(
                    document_type="booking_confirmation",
                    file_url=f"{_BASE}/demo/wrong_documents/booking_confirmation.pdf",
                    file_name="booking_confirmation.pdf",
                ),
                AttachmentInput(
                    document_type="other",
                    file_url=f"{_BASE}/demo/wrong_documents/pharmacy_receipt.pdf",
                    file_name="pharmacy_receipt.pdf",
                ),
            ],
        ),
        "needs_more_info": ClaimCreateRequest(
            full_name="Amira Hassan",
            email="amira@example.com",
            phone="+31 10 2223344",
            policy_number="POL-9047253",
            departure_date=departure,
            return_date=return_d,
            destination_country="Morocco",
            booking_reference="BK-DEMO-004",
            cancellation_reason="illness_family",
            cancellation_date=cancellation,
            aware_of_reason_date=aware_of,
            total_cost=Decimal("2850"),
            already_refunded=Decimal("0"),
            description=(
                "My mother became seriously ill before my departure and I had to cancel the "
                "trip to stay and care for her. I have attached a personal statement and the "
                "booking confirmation. I can provide a physician certificate from her doctor "
                "upon request."
            ),
            attachments=[
                AttachmentInput(
                    document_type="booking_confirmation",
                    file_url=f"{_BASE}/demo/needs_more_info/booking_confirmation.pdf",
                    file_name="booking_confirmation.pdf",
                ),
                AttachmentInput(
                    document_type="other",
                    file_url=f"{_BASE}/demo/needs_more_info/family_illness_note.pdf",
                    file_name="family_illness_note.pdf",
                ),
            ],
        ),
    }

    return profiles[profile_id]
