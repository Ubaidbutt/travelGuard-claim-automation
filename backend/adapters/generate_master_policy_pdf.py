"""
One-time script: generates master_policy.pdf in the same directory.
Run with: python adapters/generate_master_policy_pdf.py
"""

import os
from fpdf import FPDF

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "master_policy.pdf")

SECTIONS: list[tuple[str, str]] = [
    (
        "NN Travel Insurance - Master Policy Document (v2025.1)",
        """
IMPORTANT NOTICE

This Master Policy Document sets out the full terms and conditions of NN Travel Insurance.
Please read it carefully alongside your Policy Schedule, which specifies your product tier
(Basic, Classic, or Premium), your coverage limits, deductibles, and any add-ons you have
purchased. Together these two documents form your contract of insurance.

Headings are for navigation only and do not affect interpretation. Any reference to
"we", "us", or "our" means NN Travel N.V., a licensed insurer regulated under Dutch law.
"You" and "your" refer to the policyholder named in the Policy Schedule.

GOVERNING LAW: This policy is governed by the laws of the Netherlands. Disputes shall be
submitted to the competent courts of Amsterdam, unless an applicable consumer protection law
requires otherwise.
""",
    ),
    (
        "SECTION 1: DEFINITIONS",
        """
The following terms have specific meanings throughout this document.

POLICY SCHEDULE: The personalised document issued to you on purchase confirming your name,
policy number, product tier, coverage dates, coverage limits, deductible amounts, and any
add-ons in force.

PRODUCT TIER: The level of cover you purchased - Basic, Classic, or Premium - as shown in
your Policy Schedule. Each tier provides different limits and eligible cancellation reasons;
refer to Section 4 for the precise distinctions.

DEDUCTIBLE (EXCESS): The fixed amount you bear on each approved claim before we pay. Your
specific deductible per benefit is shown in your Policy Schedule.

TRAVELLING COMPANION: Any person booked to travel with you on the same itinerary who also
holds a valid NN Travel policy or was declared on your policy at purchase.

CLOSE FAMILY MEMBER: Your spouse or registered partner, parent, child, sibling,
parent-in-law, grandparent, or grandchild.

INSOLVENCY: The formal appointment of a liquidator, administrator, or receiver, or the
commencement of voluntary winding-up proceedings, by a licensed travel carrier, tour
operator, or accommodation provider.

PRE-EXISTING MEDICAL CONDITION: Any illness, disease, injury, or medical condition for
which you have received advice, diagnosis, or treatment in the 24 months immediately
preceding your policy purchase date, unless specifically declared and accepted by us in
writing.

UNFORESEEN EVENT: An event that, at the time you purchased this policy, you did not know
about and could not reasonably have anticipated.

ADD-ON: An optional extension of cover you have purchased in addition to your base product
tier, as listed in your Policy Schedule (see Section 7 for add-on terms).
""",
    ),
    (
        "SECTION 2: ELIGIBILITY AND GENERAL CONDITIONS",
        """
2.1 Eligibility
Cover is available to residents of the European Economic Area aged 18 to 80 at the time of
policy purchase. Policies covering travellers aged 0-17 or 81+ require prior written
approval from NN Travel underwriting.

2.2 Policy Status
Your policy must have status "active" at the time the cancellation event occurs. Claims
arising while your policy is in status "expired" or "suspended" will be declined. You are
responsible for renewing your policy before the coverage end date shown in your Schedule.

2.3 Territorial Scope
This policy covers trips departing from and returning to your country of residence as shown
in your Policy Schedule. Trips must not exceed 180 consecutive days for Classic or Basic
tiers, or 365 consecutive days for Premium.

2.4 Duty of Disclosure
You must tell us about any material change in circumstances that occurs after policy
purchase and that could affect the risk we are insuring, including changes to planned trips,
health status, or travel advisories. Failure to disclose material changes may result in your
claim being reduced or declined.

2.5 Fraud
Any claim that is fraudulent, exaggerated, or supported by false documentation will be
declined in full. We reserve the right to report such cases to law enforcement authorities.
""",
    ),
    (
        "SECTION 3: WHAT IS NOT COVERED (GENERAL EXCLUSIONS)",
        """
The following exclusions apply to all sections of this policy unless explicitly overridden
by an add-on listed in Section 7.

3.1 Known Events
We will not pay any claim arising from an event or circumstance that you were aware of, or
ought reasonably to have been aware of, at the date you purchased this policy.

3.2 Pre-Existing Medical Conditions
We will not pay for any claim that is directly or indirectly caused by a pre-existing
medical condition unless it has been declared and accepted by us in writing at the time of
purchase. The Pre-Existing Conditions Waiver add-on (Section 7.3) extends cover for
accepted conditions; please refer to that section if you have purchased the waiver.

3.3 Self-Inflicted Events
We will not pay for claims arising from: (a) wilful self-injury or suicide attempt,
(b) alcohol or drug abuse, (c) participation in criminal or illegal activities.

3.4 War and Political Risk
We do not cover claims arising from war, invasion, acts of foreign enemies, civil war,
rebellion, or governmental confiscation, unless you are an innocent bystander and the
event is sudden and unforeseeable.

3.5 Nuclear and Environmental
We do not cover claims caused by nuclear, biological, or chemical contamination.

3.6 Change of Mind
Disinclination to travel, change of plans, or financial hardship are not covered under any
tier.

3.7 Business Losses
Unless you have purchased the Business Equipment add-on, we do not cover loss of income,
business interruption, or any consequential financial losses beyond the trip costs set out
in your Schedule.
""",
    ),
    (
        "SECTION 4: TRIP CANCELLATION",
        """
Trip cancellation cover reimburses non-refundable, prepaid travel and accommodation costs
you lose when you are forced to cancel your trip before departure due to an unforeseen event
outside your control.

-----------------------------------------------------------------------------
4A  BASIC TIER
-----------------------------------------------------------------------------

4A.1  What is Covered
We will reimburse non-refundable prepaid costs if you cancel due to:
  a) Sudden serious illness, injury, or death of you, a travelling companion, or a close
     family member, confirmed by a registered medical practitioner.
  b) Redundancy of the policyholder, provided employment began more than 6 months before
     the policy purchase date and the redundancy was not voluntary.
  c) Jury service or witness summons that cannot be postponed.
  d) Natural disaster, severe weather, or a government-issued travel advisory
     (FCO/FCDO level 3 or above) for your destination, issued after policy purchase.
  e) Insolvency of a licensed airline or cruise line holding your booking.

4A.2  What is Not Covered
  - Any reason known to you before the policy purchase date.
  - Pre-existing medical conditions (unless declared and accepted).
  - Disinclination to travel, work commitments, or financial difficulties.
  - Claims filed more than 90 days after the cancellation event.
  - Amounts already refunded or recoverable from the carrier, credit card chargeback, or
    any other source.

4A.3  Coverage Limits
  - Maximum reimbursement: as stated in your Policy Schedule (standard: EUR 1,500 per
    person per trip).
  - Deductible: as stated in your Policy Schedule (standard: EUR 250 per claim).
  - Net payable: approved amount minus deductible, capped at your policy limit.

4A.4  Evidence Required
  (a) Original booking confirmation and payment receipts.
  (b) Documentary evidence of the cancellation reason (medical certificate, redundancy
      letter, official advisory, death certificate, etc.).
  Incomplete submissions will be returned without assessment.

-----------------------------------------------------------------------------
4B  CLASSIC TIER
-----------------------------------------------------------------------------

4B.1  What is Covered
We will reimburse non-refundable prepaid costs if you cancel due to:
  a) Sudden serious illness, injury, or death of you, a travelling companion, or any close
     family member (including spouse/partner, parent, child, sibling), confirmed by a
     registered medical practitioner.
  b) Redundancy of the policyholder, provided employment began more than 6 months before
     the policy purchase date and the redundancy was not voluntary.
  c) Jury service or witness summons that cannot be postponed.
  d) Natural disaster, severe weather, or a government-issued travel advisory
     (FCO/FCDO level 3 or above) for your destination, issued after policy purchase.
  e) Insolvency of a licensed airline, cruise line, or tour operator holding your booking.
  f) Your principal place of residence becoming uninhabitable due to fire, flood, or storm
     within 14 days of your departure date.

4B.2  What is Not Covered
  - Any reason known to you before the policy purchase date.
  - Pre-existing medical conditions (unless declared and accepted).
  - Disinclination to travel, work commitments, or financial difficulties.
  - Claims filed more than 90 days after the cancellation event.
  - Amounts already refunded or recoverable from any other source.
  - Cosmetic or elective procedures.

4B.3  Coverage Limits
  - Maximum reimbursement: as stated in your Policy Schedule (standard: EUR 5,000 per
    person per trip).
  - Deductible: as stated in your Policy Schedule (standard: EUR 100 per claim).
  - Net payable: approved amount minus deductible, capped at your policy limit.

4B.4  Evidence Required
  (a) Original booking confirmation and payment receipts.
  (b) Documentary evidence of the cancellation reason.
  (c) Written confirmation of any refunds already received.
  Incomplete submissions will be returned without assessment.

-----------------------------------------------------------------------------
4C  PREMIUM TIER
-----------------------------------------------------------------------------

4C.1  What is Covered
We will reimburse non-refundable prepaid costs if you cancel due to any unforeseen event
outside your control, including but not limited to:
  a) Sudden serious illness, injury, or death of you, a travelling companion, or any close
     family member, confirmed by a registered medical practitioner.
  b) Redundancy of the policyholder, provided employment began more than 3 months before
     the policy purchase date and the redundancy was not voluntary.
  c) Jury service or witness summons that cannot be postponed.
  d) Natural disaster, severe weather, or a government-issued travel advisory (any level)
     for your destination, issued after policy purchase.
  e) Insolvency of a licensed airline, cruise line, tour operator, or hotel holding your
     booking.
  f) Your principal place of residence becoming uninhabitable due to fire, flood, storm, or
     crime within 30 days of your departure date.
  g) Theft of travel documents (passport, visa) within 7 days of departure where
     replacement is not possible in time.
  h) Significant adverse change in personal circumstances, at the discretion of NN Travel's
     claims panel.

4C.2  What is Not Covered
  - Any reason known to you before the policy purchase date (unless Pre-Existing Conditions
    Waiver is purchased - see Section 7.3).
  - Claims filed more than 180 days after the cancellation event.
  - Amounts already refunded or recoverable from any other source.

4C.3  Coverage Limits
  - Maximum reimbursement: as stated in your Policy Schedule (standard: EUR 15,000 per
    person per trip).
  - Deductible: EUR 0 (nil excess) - no deductible applies to Premium tier.
  - Net payable: approved amount, capped at your policy limit.

4C.4  Evidence Required
  Original booking confirmation and payment receipts plus supporting documentation
  relevant to the cancellation reason. Premium tier claims are fast-tracked with a target
  decision within 5 business days.
""",
    ),
    (
        "SECTION 5: EMERGENCY MEDICAL AND REPATRIATION",
        """
5.1  What is Covered
We will pay reasonable and necessary costs of emergency medical treatment abroad if you
suffer sudden illness or accidental injury during your trip, including:
  a) Hospital charges, surgery, and prescribed medication.
  b) Emergency dental treatment (pain relief only).
  c) Medical repatriation to your home country, if medically necessary and authorised by
     our 24-hour assistance centre.
  d) Return of mortal remains, if applicable.

5.2  Coverage Limits (by Tier)
  - Basic: as stated in your Policy Schedule (standard: EUR 30,000 per person).
  - Classic: as stated in your Policy Schedule (standard: EUR 100,000 per person).
  - Premium: as stated in your Policy Schedule (standard: EUR 500,000 per person).
  Medical cover carries no deductible unless stated otherwise in your Schedule.

5.3  24-Hour Assistance
You or your treating hospital must contact our assistance centre before arranging
repatriation or any treatment expected to exceed EUR 500. Failure to notify us may
result in a 20% reduction of the eligible claim.

  Assistance Centre (24/7): +31 20 555 0100

5.4  What is Not Covered
  - Treatment for pre-existing medical conditions (unless waiver purchased).
  - Routine check-ups, non-emergency procedures, or elective surgery.
  - Costs incurred after you have been certified fit for repatriation.
  - Treatment costs in your country of residence.
""",
    ),
    (
        "SECTION 6: BAGGAGE AND PERSONAL BELONGINGS",
        """
6.1  What is Covered (Classic and Premium Tiers Only)
We will pay for accidental loss, theft, or damage to your personal baggage and belongings
during your trip, up to the limits shown in your Policy Schedule.

6.2  Single Article Limit
No single item (including a pair or set) will be paid at more than EUR 500 unless it has
been separately declared and accepted as a specified item at the time of purchase.

6.3  What is Not Covered
  - Items left unattended in a public place.
  - Fragile items broken during transit unless caused by a traffic accident.
  - Cash, bank cards, or travel documents (covered separately under Section 6.4).
  - Damage caused by wear and tear, atmospheric conditions, or vermin.
  - Sporting equipment in use (except where Adventure Sports add-on is held).
  - Electronic items not in your carry-on baggage.

6.4  Cash and Travel Documents
Loss of cash or travel documents due to theft, up to EUR 300 per trip (Classic) or
EUR 500 per trip (Premium), subject to a police report within 24 hours of discovery.

6.5  Delayed Baggage
If your checked baggage is delayed for more than 12 hours by a carrier, we will reimburse
the cost of essential toiletries and clothing up to EUR 200 (receipt required).
""",
    ),
    (
        "SECTION 7: ADD-ONS AND OPTIONAL EXTENSIONS",
        """
The following add-ons are available for purchase at the time of policy inception or renewal.
An add-on is only in force if it appears in your Policy Schedule. Add-ons extend - but do
not replace - the relevant base-tier section above.

-----------------------------------------------------------------------------
7.1  ADVENTURE SPORTS ADD-ON
-----------------------------------------------------------------------------
Extends Sections 5 and 6 to cover participation in the following activities:
  Skiing, snowboarding, surfing, white-water rafting (up to grade IV), mountaineering
  (up to 4,000 m), bungee jumping, zip-lining, scuba diving (PADI certified, up to 30 m),
  cycling races, and other activities listed in our Add-On Schedule.

Additional medical limit for adventure sports injuries:
  - As stated in your Policy Schedule (standard: EUR 50,000 per person).

Exclusions: Professional or paid competition; extreme altitude (above 4,000 m without
separate endorsement); activities not listed in the published Add-On Schedule.

-----------------------------------------------------------------------------
7.2  RENTAL CAR COLLISION ADD-ON
-----------------------------------------------------------------------------
Covers the collision damage waiver (CDW) excess charged to you by a licensed car rental
company when a rental vehicle is damaged or stolen during your trip.

Coverage limit: as stated in your Policy Schedule (standard: EUR 3,000-5,000 per trip).
Deductible: as stated in your Policy Schedule.

Requirements: (a) vehicle rented from a licensed commercial company; (b) you hold a valid
driving licence for the vehicle class; (c) damage report filed with the rental company at
the time of the incident.

Exclusions: Damage caused by driving under the influence; intentional damage; use of
the vehicle outside the country listed on the rental agreement without authorisation.

-----------------------------------------------------------------------------
7.3  PRE-EXISTING CONDITIONS WAIVER
-----------------------------------------------------------------------------
When purchased, this add-on removes the exclusion in Sections 4 and 5 for declared
pre-existing medical conditions that have been medically stable (no new symptoms,
treatment change, or hospitalisation) for at least 90 days prior to the trip departure.

"Medically stable" is defined as: no change in prescribed medication, dosage, or treatment;
no new diagnosis; no hospitalisation; no referral to a specialist in the 90 days before
departure.

-----------------------------------------------------------------------------
7.4  BUSINESS EQUIPMENT ADD-ON
-----------------------------------------------------------------------------
Extends Section 6 (Baggage) to cover loss, theft, or damage to business equipment
(laptops, cameras, professional tools) carried during a business trip.

Coverage limit: as stated in your Policy Schedule (standard: EUR 10,000 per trip).
Deductible: as stated in your Policy Schedule (standard: EUR 200 per claim).
Single item limit: EUR 3,000 unless separately specified.

Exclusions: Damage caused by software failure, virus, or power surge; equipment left
unattended in a checked bag; equipment more than 5 years old.
""",
    ),
    (
        "SECTION 8: CLAIMS PROCEDURE",
        """
8.1  Notification
You must notify us of your intention to claim as soon as reasonably practicable and within
the time limits set out in your product tier (90 days for Basic and Classic; 180 days for
Premium), measured from the date of the cancellation event or loss.

8.2  How to Submit a Claim
Submit your claim through the NN Travel online claims portal at claims.nn-travel.example.com
or by post to: NN Travel Claims, Amstelplein 1, 1096 HA Amsterdam, the Netherlands.

Each submission must include:
  a) A completed claim form (available on our portal).
  b) Your policy number and Policy Schedule.
  c) Original booking confirmation and proof of payment for all costs claimed.
  d) Documentary evidence specific to your cancellation reason (see Section 4 for your
     tier's requirements).
  e) Bank account details for payment.

8.3  Document Authenticity
All documents must be originals or certified copies. We reserve the right to request
further evidence or to verify documents directly with the issuing authority. Submission
of falsified documents constitutes fraud.

8.4  Assessment Timeline
  - Basic/Classic: target decision within 10 business days of receiving a complete claim.
  - Premium: target decision within 5 business days of receiving a complete claim.
  If we require additional information, the clock pauses until we receive your response.

8.5  Payment
Approved claims are paid by bank transfer in euros to the account you specify. Conversion
to other currencies is at the exchange rate on the date of payment.

8.6  Disputes and Complaints
If you are dissatisfied with our decision, you may request an internal review within
30 days of receiving our decision letter. If still dissatisfied after the internal review,
you may refer the matter to the Dutch Financial Services Complaints Institute (Kifid)
within three months.
""",
    ),
    (
        "SECTION 9: CANCELLING YOUR POLICY",
        """
9.1  Cooling-Off Period
You may cancel this policy within 14 days of receiving your Policy Schedule (the cooling-off
period) and receive a full refund, provided no trip has commenced and no claim has been
submitted or is pending.

9.2  Cancellation After Cooling-Off
After the 14-day cooling-off period, you may cancel this policy at any time by written
notice to us. A pro-rata refund of the remaining premium will be issued, less an
administration fee of EUR 25, provided no claim has been made during the current policy
period.

9.3  Our Right to Cancel
We may cancel this policy by giving you 30 days' written notice if:
  a) You fail to pay the premium.
  b) You have provided materially false or misleading information.
  c) You have made a fraudulent claim.
In cases of fraud, no refund will be issued.
""",
    ),
    (
        "SECTION 10: CONTACT INFORMATION",
        """
NN Travel N.V.
Amstelplein 1, 1096 HA Amsterdam, the Netherlands

Customer Service: +31 20 555 0199 | support@nn-travel.example.com
Emergency Assistance (24/7): +31 20 555 0100
Claims Portal: claims.nn-travel.example.com

Regulated by De Nederlandsche Bank (DNB) and the Netherlands Authority for the Financial
Markets (AFM). Registration number: 12345678.

This policy document was issued under Master Policy version 2025.1.
NN Travel N.V. - All rights reserved.
""",
    ),
]


def build_pdf() -> None:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(left=20, top=20, right=20)
    W = 170  # A4 210mm - 20mm left - 20mm right

    def put(text: str, h: float = 5, bold: bool = False, size: int = 9) -> None:
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", style="B" if bold else "", size=size)
        pdf.multi_cell(W, h, text)
        pdf.set_font("Helvetica", style="", size=9)

    for i, (title, body) in enumerate(SECTIONS):
        pdf.add_page()

        if i == 0:
            put(title, h=10, bold=True, size=16)
            pdf.ln(6)
            put("Version 2025.1  |  NN Travel N.V.", h=6)
            pdf.ln(8)
        else:
            put(title, h=8, bold=True, size=13)
            pdf.ln(4)

        for line in body.strip().splitlines():
            stripped = line.strip()
            if stripped == "":
                pdf.ln(3)
            elif len(stripped) > 30 and all(c == "-" for c in stripped):
                # Separator line (was box-drawing chars, now dashes)
                pdf.ln(2)
                put(stripped, bold=True)
                pdf.ln(1)
            elif stripped and stripped[0].isdigit() and "." in stripped[:5]:
                pdf.ln(2)
                put(stripped, bold=True)
            elif any(stripped.startswith(kw) for kw in ("IMPORTANT", "GOVERNING", "NOTE")):
                put(stripped, bold=True)
            else:
                put(stripped)

    pdf.output(OUTPUT_PATH)
    print(f"PDF written to: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_pdf()
