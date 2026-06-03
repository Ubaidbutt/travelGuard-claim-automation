#!/usr/bin/env python3
"""
Generates realistic demo PDF documents and uploads them to Supabase Storage.
Prints the public URLs to stdout after upload.

Usage:
    cd backend
    uv run python scripts/upload_demo_docs.py
"""

import io
import os
import sys
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fpdf import FPDF
from supabase import create_client

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
BUCKET = "claim-documents"

# Fixed reference dates — close to today so the demo claim dates align.
TODAY = date.today()
CANCELLATION_DATE = (TODAY - timedelta(days=7)).strftime("%d %B %Y")
DEPARTURE_DATE = (TODAY + timedelta(days=30)).strftime("%d %B %Y")
RETURN_DATE = (TODAY + timedelta(days=40)).strftime("%d %B %Y")


# ── PDF builders ──────────────────────────────────────────────────────────────

def _base_pdf() -> FPDF:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(20, 20, 20)
    pdf.add_page()
    return pdf


def _header(pdf: FPDF, org: str, address: str) -> None:
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, org, ln=True, align="C")
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, address, ln=True, align="C")
    pdf.ln(6)
    pdf.set_draw_color(80, 80, 80)
    pdf.set_line_width(0.4)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(6)


def _section(pdf: FPDF, title: str) -> None:
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, title, ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.ln(1)


def _para(pdf: FPDF, text: str) -> None:
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5.5, text)
    pdf.ln(2)


def physician_statement_approval() -> bytes:
    """Clear medical certificate confirming appendicitis and unfitness to travel."""
    pdf = _base_pdf()
    _header(pdf, "MUNICH GENERAL HOSPITAL",
            "Ziemssenstrasse 5 · 80336 Munich, Germany · Tel: +49 89 4400-0")

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "MEDICAL CERTIFICATE FOR INSURANCE PURPOSES", ln=True, align="C")
    pdf.ln(4)

    _section(pdf, "Patient Details")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(50, 6, "Patient Name:")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Sarah Müller", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(50, 6, "Date of Birth:")
    pdf.cell(0, 6, "12 April 1989", ln=True)
    pdf.cell(50, 6, "Date of Issue:")
    pdf.cell(0, 6, CANCELLATION_DATE, ln=True)
    pdf.cell(50, 6, "Hospital Case No:")
    pdf.cell(0, 6, "MGH-2026-0847213", ln=True)
    pdf.ln(4)

    _section(pdf, "Clinical Findings and Diagnosis")
    _para(pdf,
        "Mrs. Sarah Müller was admitted to Munich General Hospital on "
        + CANCELLATION_DATE +
        " presenting with acute lower right abdominal pain, fever (38.9°C), "
        "and elevated white blood cell count consistent with acute appendicitis."
    )
    _para(pdf,
        "Following emergency assessment and imaging (CT abdomen/pelvis), the "
        "diagnosis of acute appendicitis was confirmed. Mrs. Müller underwent "
        "laparoscopic appendectomy under general anaesthesia on the same day. "
        "The procedure was completed without intraoperative complications."
    )

    _section(pdf, "Medical Opinion Regarding Fitness to Travel")
    _para(pdf,
        "As a direct consequence of the acute surgical condition and the "
        "post-operative recovery requirements, Mrs. Sarah Müller was and "
        "remains UNFIT TO TRAVEL for a minimum period of six (6) weeks "
        "from the date of this certificate."
    )
    _para(pdf,
        "The cancellation of her scheduled international travel was medically "
        "necessary and entirely attributable to this unforeseen acute medical event. "
        "There was no indication of this condition prior to admission."
    )

    _section(pdf, "Certifying Physician")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(50, 6, "Physician:")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Dr. Klaus Weber, MD, FRCS", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(50, 6, "Speciality:")
    pdf.cell(0, 6, "Consultant General Surgeon", ln=True)
    pdf.cell(50, 6, "Registration No:")
    pdf.cell(0, 6, "DE-MED-12345678", ln=True)
    pdf.cell(50, 6, "Institution:")
    pdf.cell(0, 6, "Munich General Hospital", ln=True)
    pdf.ln(6)

    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(0, 5,
        "This certificate is issued solely for insurance purposes at the request "
        "of the patient. The information contained herein is accurate to the best "
        "of the physician's knowledge based on clinical records."
    )

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def booking_confirmation(
    customer_name: str,
    booking_ref: str,
    destination: str,
    total_cost: str,
) -> bytes:
    """Generic booking confirmation showing non-refundable trip cost."""
    pdf = _base_pdf()
    _header(pdf, "TRAVELGUARD TOURS",
            "Booking Reference Confirmation · support@travelguardtours.com")

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "BOOKING CONFIRMATION", ln=True, align="C")
    pdf.ln(4)

    _section(pdf, "Booking Details")
    pdf.set_font("Helvetica", "", 10)
    details = [
        ("Booking Reference:", booking_ref),
        ("Customer Name:", customer_name),
        ("Booking Date:", (TODAY - timedelta(days=60)).strftime("%d %B %Y")),
    ]
    for label, value in details:
        pdf.cell(55, 6, label)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, value, ln=True)
        pdf.set_font("Helvetica", "", 10)
    pdf.ln(3)

    _section(pdf, "Itinerary")
    _para(pdf,
        f"Destination: {destination}\n"
        f"Departure:   {DEPARTURE_DATE}\n"
        f"Return:      {RETURN_DATE}\n"
        f"Duration:    10 nights"
    )

    _section(pdf, "Cost Summary")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(120, 6, "Flights (return, economy class)")
    pdf.cell(0, 6, "EUR 450.00", ln=True, align="R")
    pdf.cell(120, 6, "Hotel accommodation (10 nights, B&B)")
    pdf.cell(0, 6, "EUR 450.00", ln=True, align="R")
    pdf.cell(120, 6, "Travel services & fees")
    pdf.cell(0, 6, "EUR 100.00", ln=True, align="R")
    pdf.set_line_width(0.3)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(120, 6, "TOTAL PAID")
    pdf.cell(0, 6, total_cost, ln=True, align="R")
    pdf.set_font("Helvetica", "", 10)
    pdf.ln(3)

    _section(pdf, "Cancellation Policy")
    pdf.set_font("Helvetica", "B", 10)
    _para(pdf,
        "NON-REFUNDABLE: This booking is entirely non-refundable once confirmed. "
        "No refunds will be issued for cancellations, changes, or no-shows regardless "
        "of reason. Customers are advised to hold appropriate travel insurance."
    )
    pdf.set_font("Helvetica", "", 10)

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def pharmacy_receipt() -> bytes:
    """
    A pharmacy purchase receipt — clearly NOT a physician statement.
    Used for the 'wrong documents' demo scenario to trigger rejection.
    """
    pdf = _base_pdf()
    _header(pdf, "APOTHEEK CENTRUM AMSTERDAM",
            "Kalverstraat 15 · 1012 Amsterdam · Tel: +31 20 555 0142")

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "PURCHASE RECEIPT", ln=True, align="C")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(55, 6, "Date:")
    pdf.cell(0, 6, CANCELLATION_DATE, ln=True)
    pdf.cell(55, 6, "Customer:")
    pdf.cell(0, 6, "Pieter van Dam", ln=True)
    pdf.cell(55, 6, "Receipt No:")
    pdf.cell(0, 6, "APH-2026-88312", ln=True)
    pdf.ln(4)

    _section(pdf, "Items Purchased")
    items = [
        ("Ibuprofen 400mg (24 tablets)", "EUR8.50"),
        ("Throat Lozenges Strepsils (36)", "EUR5.20"),
        ("Vitamin C 1000mg effervescent (20 tabs)", "EUR6.80"),
        ("Paracetamol 500mg (32 tablets)", "EUR4.95"),
    ]
    for name, price in items:
        pdf.cell(140, 6, name)
        pdf.cell(0, 6, price, ln=True, align="R")
    pdf.ln(1)
    pdf.set_line_width(0.3)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(140, 6, "Subtotal")
    pdf.cell(0, 6, "EUR25.45", ln=True, align="R")
    pdf.cell(140, 6, "VAT (9%)")
    pdf.cell(0, 6, "EUR2.29", ln=True, align="R")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(140, 6, "TOTAL")
    pdf.cell(0, 6, "EUR27.74", ln=True, align="R")
    pdf.set_font("Helvetica", "", 10)
    pdf.ln(2)
    pdf.cell(55, 6, "Payment method:")
    pdf.cell(0, 6, "Maestro card ending 8821", ln=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(0, 5,
        "All items above were purchased over the counter without a prescription. "
        "This is a sales receipt only. For medical advice or documentation, "
        "please consult your general practitioner."
    )

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def family_illness_note() -> bytes:
    """
    Self-written personal statement — no physician certificate, no proof of relationship.
    Used for the 'needs more info' demo scenario.
    """
    pdf = _base_pdf()
    _header(pdf, "PERSONAL STATEMENT",
            "Supporting documentation for travel insurance claim")

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(40, 6, "Date:")
    pdf.cell(0, 6, CANCELLATION_DATE, ln=True)
    pdf.cell(40, 6, "From:")
    pdf.cell(0, 6, "Amira Hassan", ln=True)
    pdf.cell(40, 6, "Re:")
    pdf.cell(0, 6, "Trip cancellation - Morocco, Booking BK-DEMO-004", ln=True)
    pdf.ln(6)

    _para(pdf, "To Whom It May Concern,")
    _para(pdf,
        "I am writing this personal statement in support of my travel insurance "
        "claim for the cancellation of my trip to Morocco."
    )
    _para(pdf,
        "My mother became seriously ill shortly before my planned departure date. "
        "The seriousness of her condition meant that I was unable to travel and "
        "had to remain to provide care and support for her."
    )
    _para(pdf,
        "I understand that formal medical documentation may be required to support "
        "this claim. I am in the process of obtaining a certificate from her treating "
        "physician and can provide this upon request within the next few days."
    )
    _para(pdf,
        "I confirm that the above information is true and accurate to the best of "
        "my knowledge. I am happy to provide any additional information the "
        "insurance company may require."
    )
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 10)
    _para(pdf, "Sincerely,")
    pdf.set_font("Helvetica", "B", 10)
    _para(pdf, "Amira Hassan")
    pdf.set_font("Helvetica", "", 10)
    _para(pdf, CANCELLATION_DATE)

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def cancellation_proof(customer_name: str, booking_ref: str, destination: str) -> bytes:
    """Official cancellation notice from the travel provider."""
    pdf = _base_pdf()
    _header(pdf, "TRAVELGUARD TOURS",
            "Cancellation Notice · cancellations@travelguardtours.com")

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "CANCELLATION CONFIRMATION", ln=True, align="C")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(55, 6, "Booking Reference:")
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, booking_ref, ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(55, 6, "Customer:")
    pdf.cell(0, 6, customer_name, ln=True)
    pdf.cell(55, 6, "Destination:")
    pdf.cell(0, 6, destination, ln=True)
    pdf.cell(55, 6, "Cancellation Date:")
    pdf.cell(0, 6, CANCELLATION_DATE, ln=True)
    pdf.ln(4)

    _section(pdf, "Cancellation Details")
    _para(pdf,
        f"This letter confirms that booking {booking_ref} for {customer_name} "
        f"travelling to {destination} has been cancelled as of {CANCELLATION_DATE}."
    )
    _para(pdf,
        "In accordance with our non-refundable booking terms and conditions, "
        "no refund will be issued. The full amount paid (EUR3,200.00) has been "
        "retained as per the booking agreement."
    )
    _para(pdf,
        "This cancellation confirmation is provided for insurance claim purposes. "
        "Please retain this document as proof of cancellation."
    )

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


# ── Upload ─────────────────────────────────────────────────────────────────────

def upload_file(client, path: str, content: bytes) -> str:
    """Upload bytes to Supabase Storage and return the public URL."""
    try:
        # Remove existing file if present (upsert)
        client.storage.from_(BUCKET).remove([path])
    except Exception:
        pass

    client.storage.from_(BUCKET).upload(
        path=path,
        file=content,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )

    result = client.storage.from_(BUCKET).get_public_url(path)
    return result


def main() -> None:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    docs: dict[str, bytes] = {
        # Scenario 1: Clean approval
        "demo/approval/physician_statement.pdf": physician_statement_approval(),
        "demo/approval/booking_confirmation.pdf": booking_confirmation(
            "Sarah Müller", "BK-DEMO-001", "Italy", "EUR1,000.00"
        ),
        "demo/approval/cancellation_proof.pdf": cancellation_proof(
            "Sarah Müller", "BK-DEMO-001", "Italy"
        ),

        # Scenario 2: Expired policy (rule rejection — docs don't affect outcome)
        "demo/expired_policy/booking_confirmation.pdf": booking_confirmation(
            "Jan de Vries", "BK-DEMO-002", "France", "EUR1,200.00"
        ),

        # Scenario 3: Wrong / insufficient documents
        "demo/wrong_documents/booking_confirmation.pdf": booking_confirmation(
            "Pieter van Dam", "BK-DEMO-003", "Spain", "EUR1,100.00"
        ),
        "demo/wrong_documents/pharmacy_receipt.pdf": pharmacy_receipt(),

        # Scenario 4: Incomplete evidence — needs more info
        "demo/needs_more_info/booking_confirmation.pdf": booking_confirmation(
            "Amira Hassan", "BK-DEMO-004", "Morocco", "EUR2,850.00"
        ),
        "demo/needs_more_info/family_illness_note.pdf": family_illness_note(),
    }

    print(f"\nUploading {len(docs)} demo documents to Supabase Storage...\n")
    urls: dict[str, str] = {}
    for path, content in docs.items():
        url = upload_file(client, path, content)
        urls[path] = url
        print(f"  ✓ {path}")
        print(f"    {url}\n")

    print("\n" + "=" * 70)
    print("URLS FOR demoProfiles.ts:")
    print("=" * 70)
    for path, url in urls.items():
        print(f'  "{path}": "{url}",')


if __name__ == "__main__":
    main()
