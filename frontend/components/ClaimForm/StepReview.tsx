'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import { CheckCircle2, Circle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CANCELLATION_REASON_LABELS, getSlotsForReason } from '@/lib/documentSlots'
import type { ClaimFormValues } from './schema'

export function StepReview() {
  const { control, register, formState: { errors } } = useFormContext<ClaimFormValues>()
  const values = useWatch({ control }) as ClaimFormValues

  const slots = getSlotsForReason(values.cancellation_reason)
  const uploadedCount = slots.filter((s) => values.attachments?.[s.id]).length
  const net = (values.total_cost ?? 0) - (values.already_refunded ?? 0)

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  function Row({ label, value }: { label: string; value: string | number | undefined }) {
    return (
      <div className="flex justify-between items-center px-4 py-2.5 even:bg-slate-50">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-medium text-slate-800 text-right max-w-[58%] truncate">{value ?? '—'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Review your information before submitting.</p>

      <Section title="Personal details">
        <Row label="Full name" value={values.full_name} />
        <Row label="Email" value={values.email} />
        <Row label="Phone" value={values.phone} />
        <Row label="Policy number" value={values.policy_number} />
      </Section>

      <Section title="Trip details">
        <Row label="Departure" value={formatDate(values.departure_date)} />
        <Row label="Return" value={formatDate(values.return_date)} />
        <Row label="Destination" value={values.destination_country} />
        <Row label="Booking reference" value={values.booking_reference} />
        <Row label="Cancellation reason" value={CANCELLATION_REASON_LABELS[values.cancellation_reason] ?? values.cancellation_reason} />
        <Row label="Cancellation date" value={formatDate(values.cancellation_date)} />
        <Row label="Date you became aware" value={formatDate(values.aware_of_reason_date)} />
        <Row label="Total trip cost" value={formatCurrency(values.total_cost ?? 0)} />
        <Row label="Already refunded" value={formatCurrency(values.already_refunded ?? 0)} />
        <div className="flex justify-between items-center px-4 py-2.5 bg-indigo-50">
          <span className="text-xs font-medium text-indigo-700">Net claim amount</span>
          <span className="text-xs font-bold text-indigo-800">{formatCurrency(net)}</span>
        </div>
      </Section>

      {values.description && (
        <Section title="Description">
          <div className="px-4 py-3">
            <p className="text-xs text-slate-700 leading-relaxed">{values.description}</p>
          </div>
        </Section>
      )}

      <Section title={`Documents (${uploadedCount}/${slots.length} uploaded)`}>
        {slots.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-xs text-slate-400">No documents required.</p>
          </div>
        ) : (
          slots.map((slot) => {
            const uploaded = values.attachments?.[slot.id]
            return (
              <div key={slot.id} className="flex items-center gap-3 px-4 py-2.5 even:bg-slate-50">
                {uploaded
                  ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  : <Circle size={14} className={slot.required ? 'text-red-500 shrink-0' : 'text-slate-300 shrink-0'} />
                }
                <span className={`text-xs ${uploaded ? 'text-slate-800' : slot.required ? 'text-red-600' : 'text-slate-400'}`}>
                  {slot.label}
                </span>
                {uploaded && (
                  <span className="text-[10px] text-slate-400 ml-auto truncate max-w-[40%]">{uploaded.file_name}</span>
                )}
              </div>
            )
          })
        )}
      </Section>

      {/* Confirmation */}
      <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('confirmation')}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500/30 focus:ring-2 accent-indigo-600"
          />
          <div>
            <p className="text-sm font-medium text-slate-900">I confirm all claim details are correct.</p>
            <p className="mt-0.5 text-xs text-slate-500">By confirming, you authorise submission of this claim for assessment.</p>
          </div>
        </label>
        {errors.confirmation && (
          <p className="mt-2 text-xs text-red-600">{errors.confirmation.message}</p>
        )}
      </div>
    </div>
  )
}
