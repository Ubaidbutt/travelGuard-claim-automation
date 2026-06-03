import type { ClaimCreatePayload } from '@/types/claim'

export interface PolicySummary {
  policyNumber: string
  holder: string
  tier: 'Basic' | 'Classic' | 'Premium'
  status: 'Active' | 'Expired' | 'Suspended'
  tripCancellationLimit: string
  deductible: string
  priorClaims12Months: number
  note?: string
}

export interface DemoProfile {
  id: string
  title: string
  subtitle: string
  description: string
  likelihoodLabel: string
  likelihoodHint: string
  likelihoodLevel: 'positive' | 'negative' | 'uncertain'
  policyDetails: PolicySummary
  payload: ClaimCreatePayload
}

const BASE = 'https://lzcmhzwdledddqfsrkkv.supabase.co/storage/v1/object/public/claim-documents'

function isoOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getDemoProfiles(): DemoProfile[] {
  const departure = isoOffset(30)
  const returnDate = isoOffset(40)
  const cancellation = isoOffset(-7)
  const awareOf = isoOffset(-7)

  return [
    {
      id: 'approval',
      title: 'Clean Approval',
      subtitle: 'Sarah Müller · Premium Policy',
      description:
        'Valid active policy, clear medical certificate, and all conditions met. A straightforward illness claim with strong supporting documents.',
      likelihoodLabel: 'More likely to be approved',
      likelihoodHint:
        'Active policy, clear physician statement, and all required documents present.',
      likelihoodLevel: 'positive',
      policyDetails: {
        policyNumber: 'POL-7823419',
        holder: 'Sarah Müller',
        tier: 'Premium',
        status: 'Active',
        tripCancellationLimit: 'EUR 5,000',
        deductible: 'None',
        priorClaims12Months: 0,
        note: 'No prior claims — clean history.',
      },
      payload: {
        full_name: 'Sarah Müller',
        email: 'sarah@example.com',
        phone: '+49 89 12345678',
        policy_number: 'POL-7823419',
        departure_date: departure,
        return_date: returnDate,
        destination_country: 'Italy',
        booking_reference: 'BK-DEMO-001',
        cancellation_reason: 'illness_claimant',
        cancellation_date: cancellation,
        aware_of_reason_date: awareOf,
        total_cost: 1000,
        already_refunded: 0,
        description:
          'I was admitted to Munich General Hospital with acute appendicitis seven days before my scheduled departure. My surgeon, Dr. Klaus Weber, performed an emergency appendectomy and issued a medical certificate confirming I am unfit to travel for six weeks. The trip is entirely non-refundable. I have attached the physician statement, booking confirmation, and cancellation proof.',
        attachments: [
          {
            document_type: 'physician_statement',
            file_url: `${BASE}/demo/approval/physician_statement.pdf`,
            file_name: 'physician_statement.pdf',
          },
          {
            document_type: 'booking_confirmation',
            file_url: `${BASE}/demo/approval/booking_confirmation.pdf`,
            file_name: 'booking_confirmation.pdf',
          },
          {
            document_type: 'cancellation_proof',
            file_url: `${BASE}/demo/approval/cancellation_proof.pdf`,
            file_name: 'cancellation_proof.pdf',
          },
        ],
      },
    },
    {
      id: 'expired_policy',
      title: 'Expired Policy',
      subtitle: 'Jan de Vries · Basic Policy',
      description:
        'Policy lapsed before the claim was filed. The eligibility checks detect this and the claim is unlikely to proceed regardless of the documents.',
      likelihoodLabel: 'High risk of rejection',
      likelihoodHint:
        'Policy has expired — the eligibility rules are likely to block this before the AI is even called.',
      likelihoodLevel: 'negative',
      policyDetails: {
        policyNumber: 'POL-3156082',
        holder: 'Jan de Vries',
        tier: 'Basic',
        status: 'Expired',
        tripCancellationLimit: 'EUR 2,000',
        deductible: 'EUR 200',
        priorClaims12Months: 0,
        note: 'Coverage ended 1 Jan 2024.',
      },
      payload: {
        full_name: 'Jan de Vries',
        email: 'jan@example.com',
        phone: '+31 20 9876543',
        policy_number: 'POL-3156082',
        departure_date: departure,
        return_date: returnDate,
        destination_country: 'France',
        booking_reference: 'BK-DEMO-002',
        cancellation_reason: 'illness_claimant',
        cancellation_date: cancellation,
        aware_of_reason_date: awareOf,
        total_cost: 1200,
        already_refunded: 0,
        description:
          'I fell ill before my planned trip to Paris and was advised by my doctor not to travel. I am filing this claim to recover my non-refundable booking costs of EUR 1,200.',
        attachments: [
          {
            document_type: 'booking_confirmation',
            file_url: `${BASE}/demo/expired_policy/booking_confirmation.pdf`,
            file_name: 'booking_confirmation.pdf',
          },
        ],
      },
    },
    {
      id: 'wrong_documents',
      title: 'Wrong Documents',
      subtitle: 'Pieter van Dam · Basic Policy',
      description:
        'Policy is active and the reason is covered, but only a pharmacy receipt was submitted instead of a physician statement. Likely to be rejected by the AI for insufficient evidence.',
      likelihoodLabel: 'Likely to be rejected',
      likelihoodHint:
        'A pharmacy receipt is not a physician statement — the AI will likely flag this as insufficient evidence.',
      likelihoodLevel: 'negative',
      policyDetails: {
        policyNumber: 'POL-4512896',
        holder: 'Pieter van Dam',
        tier: 'Basic',
        status: 'Active',
        tripCancellationLimit: 'EUR 1,500',
        deductible: 'EUR 250',
        priorClaims12Months: 0,
        note: 'Clean history, but low tier with high deductible.',
      },
      payload: {
        full_name: 'Pieter van Dam',
        email: 'pieter@example.com',
        phone: '+31 70 5554433',
        policy_number: 'POL-4512896',
        departure_date: departure,
        return_date: returnDate,
        destination_country: 'Spain',
        booking_reference: 'BK-DEMO-003',
        cancellation_reason: 'illness_claimant',
        cancellation_date: cancellation,
        aware_of_reason_date: awareOf,
        total_cost: 1100,
        already_refunded: 0,
        description:
          'I had to cancel my trip to Spain due to illness. I have attached my booking confirmation and a pharmacy receipt showing I purchased medication around the time of cancellation.',
        attachments: [
          {
            document_type: 'booking_confirmation',
            file_url: `${BASE}/demo/wrong_documents/booking_confirmation.pdf`,
            file_name: 'booking_confirmation.pdf',
          },
          {
            document_type: 'other',
            file_url: `${BASE}/demo/wrong_documents/pharmacy_receipt.pdf`,
            file_name: 'pharmacy_receipt.pdf',
          },
        ],
      },
    },
    {
      id: 'needs_more_info',
      title: 'Incomplete Evidence',
      subtitle: 'Amira Hassan · Classic Policy',
      description:
        'Covered reason, but only a self-written personal note with no physician certificate or proof of relationship. The AI may refer this for manual review.',
      likelihoodLabel: 'May need more information',
      likelihoodHint:
        'Some evidence present but no medical certificate for the family member. Prior claim history adds uncertainty.',
      likelihoodLevel: 'uncertain',
      policyDetails: {
        policyNumber: 'POL-9047253',
        holder: 'Amira Hassan',
        tier: 'Classic',
        status: 'Active',
        tripCancellationLimit: 'EUR 5,000',
        deductible: 'EUR 100',
        priorClaims12Months: 2,
        note: '2 prior claims in the last 12 months — adds scrutiny.',
      },
      payload: {
        full_name: 'Amira Hassan',
        email: 'amira@example.com',
        phone: '+31 10 2223344',
        policy_number: 'POL-9047253',
        departure_date: departure,
        return_date: returnDate,
        destination_country: 'Morocco',
        booking_reference: 'BK-DEMO-004',
        cancellation_reason: 'illness_family',
        cancellation_date: cancellation,
        aware_of_reason_date: awareOf,
        total_cost: 2850,
        already_refunded: 0,
        description:
          'My mother became seriously ill before my departure and I had to cancel the trip to stay and care for her. I have attached a personal statement and the booking confirmation. I can provide a physician certificate from her doctor upon request.',
        attachments: [
          {
            document_type: 'booking_confirmation',
            file_url: `${BASE}/demo/needs_more_info/booking_confirmation.pdf`,
            file_name: 'booking_confirmation.pdf',
          },
          {
            document_type: 'other',
            file_url: `${BASE}/demo/needs_more_info/family_illness_note.pdf`,
            file_name: 'family_illness_note.pdf',
          },
        ],
      },
    },
  ]
}
