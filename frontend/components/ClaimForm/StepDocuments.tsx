'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import { DocumentSlot } from '@/components/DocumentSlot'
import { getSlotsForReason } from '@/lib/documentSlots'
import type { ClaimFormValues } from './schema'

interface Props {
  tempClaimId: string
  docError?: string
}

export function StepDocuments({ tempClaimId, docError }: Props) {
  const { setValue, getValues } = useFormContext<ClaimFormValues>()
  const attachments = useWatch<ClaimFormValues, 'attachments'>({ name: 'attachments' }) ?? {}
  const cancellationReason = useWatch<ClaimFormValues, 'cancellation_reason'>({ name: 'cancellation_reason' })

  const slots = getSlotsForReason(cancellationReason)

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Upload supporting documents. Required items are marked{' '}
        <span className="text-red-500 font-medium">*</span>.
      </p>

      <div className="space-y-3">
        {slots.map((slot) => (
          <DocumentSlot
            key={slot.id}
            slot={slot}
            tempClaimId={tempClaimId}
            value={attachments[slot.id]}
            onChange={(val) => {
              const current = getValues('attachments') ?? {}
              setValue('attachments', { ...current, [slot.id]: val }, { shouldDirty: true })
            }}
          />
        ))}
      </div>

      {docError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{docError}</p>
        </div>
      )}
    </div>
  )
}
