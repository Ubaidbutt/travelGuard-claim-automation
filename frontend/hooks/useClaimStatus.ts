'use client'
import { useQuery } from '@tanstack/react-query'
import { getClaimStatus } from '@/lib/api'

const POLLING_STATUSES = new Set(['pending', 'processing'])

export function useClaimStatus(claimId: string | null) {
  return useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => getClaimStatus(claimId!),
    enabled: !!claimId,
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && POLLING_STATUSES.has(status) ? 5000 : false
    },
  })
}
