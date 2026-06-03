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

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Important notice</p>
            <p className="mt-0.5 text-sm text-amber-700">
              Submitting false, misleading, or fabricated documents in support of an insurance claim
              constitutes fraud. This is a criminal offence under applicable law and may result in
              immediate claim rejection, permanent policy cancellation, and civil or criminal
              proceedings. All submitted documents are verified.
            </p>
          </div>
        </div>
      </div>

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
