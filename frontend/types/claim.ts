export interface ClaimCreatePayload {
  full_name: string
  email: string
  phone: string
  policy_number: string
  departure_date: string
  return_date: string
  destination_country: string
  booking_reference: string
  cancellation_reason: string
  cancellation_date: string
  aware_of_reason_date: string
  total_cost: number
  already_refunded: number
  description: string
  attachments: { document_type: string; file_url: string; file_name: string }[]
}

export interface ClaimStatusResponse {
  claim_id: string
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'needs_more_info' | 'failed'
  decision_summary: string | null
  approved_amount: number | null
  created_at: string
  updated_at: string
}
