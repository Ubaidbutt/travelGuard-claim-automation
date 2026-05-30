import type { ClaimCreatePayload, ClaimStatusResponse } from '@/types/claim'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export class ClaimNotFoundError extends Error {
  constructor(claimId: string) {
    super(`No claim found for ID "${claimId}". Please check your reference number.`)
    this.name = 'ClaimNotFoundError'
  }
}

export async function submitClaim(
  payload: ClaimCreatePayload
): Promise<{ claim_id: string; status: string }> {
  const res = await fetch(`${BASE_URL}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Failed to submit claim')
  }
  return res.json()
}

export async function validatePolicy(payload: {
  policy_number: string
  email: string
  date_of_birth: string
}): Promise<void> {
  const res = await fetch(`${BASE_URL}/claims/validate-policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Unable to verify policy details')
  }
}

export async function getClaimStatus(claimId: string): Promise<ClaimStatusResponse> {
  const res = await fetch(`${BASE_URL}/claims/${claimId}`)
  if (!res.ok) {
    if (res.status === 404) throw new ClaimNotFoundError(claimId)
    throw new Error('Failed to fetch claim status. Please try again.')
  }
  return res.json()
}
