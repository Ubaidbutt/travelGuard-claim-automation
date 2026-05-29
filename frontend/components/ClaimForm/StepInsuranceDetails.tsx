'use client'

import { Controller, useFormContext } from 'react-hook-form'
import { CANCELLATION_REASON_LABELS } from '@/lib/documentSlots'
import type { ClaimFormValues } from './schema'

function Field({
  id, label, error, hint, children,
}: {
  id?: string; label: string; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

const inputClass =
  'input-dark w-full aria-invalid:border-red-400 aria-invalid:ring-2 aria-invalid:ring-red-500/15'

const selectArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`

export function StepInsuranceDetails() {
  const { register, control, watch, formState: { errors } } = useFormContext<ClaimFormValues>()
  const descriptionLength = (watch('description') ?? '').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field id="departure_date" label="Departure date" error={errors.departure_date?.message}>
          <input id="departure_date" type="date" {...register('departure_date')}
            className={inputClass} aria-invalid={!!errors.departure_date} />
        </Field>
        <Field id="return_date" label="Return date" error={errors.return_date?.message}>
          <input id="return_date" type="date" {...register('return_date')}
            className={inputClass} aria-invalid={!!errors.return_date} />
        </Field>
      </div>

      <Field id="destination_country" label="Destination country" error={errors.destination_country?.message}>
        <input id="destination_country" {...register('destination_country')} placeholder="France"
          className={inputClass} aria-invalid={!!errors.destination_country} />
      </Field>

      <Field
        id="booking_reference"
        label="Booking reference"
        hint="Your tour operator, airline, or hotel booking confirmation number."
        error={errors.booking_reference?.message}
      >
        <input id="booking_reference" {...register('booking_reference')} placeholder="BK-123456"
          className={inputClass} aria-invalid={!!errors.booking_reference} />
      </Field>

      <Field label="Cancellation reason" error={errors.cancellation_reason?.message}>
        <Controller
          name="cancellation_reason"
          control={control}
          render={({ field }) => (
            <select
              value={field.value ?? ''}
              onChange={field.onChange}
              aria-invalid={!!errors.cancellation_reason}
              className={`${inputClass} appearance-none bg-no-repeat bg-[right_14px_center] pr-9`}
              style={{ backgroundImage: selectArrow }}
            >
              <option value="" disabled>Select a reason</option>
              {Object.entries(CANCELLATION_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field id="cancellation_date" label="Cancellation date" error={errors.cancellation_date?.message}>
          <input id="cancellation_date" type="date" {...register('cancellation_date')}
            className={inputClass} aria-invalid={!!errors.cancellation_date} />
        </Field>
        <Field
          id="aware_of_reason_date"
          label="Date you became aware"
          hint="When did you first learn about the reason for cancelling?"
          error={errors.aware_of_reason_date?.message}
        >
          <input id="aware_of_reason_date" type="date" {...register('aware_of_reason_date')}
            className={inputClass} aria-invalid={!!errors.aware_of_reason_date} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="total_cost" label="Total trip cost (€)" error={errors.total_cost?.message}>
          <input id="total_cost" type="number" step="0.01" min="0" placeholder="0.00"
            {...register('total_cost', { valueAsNumber: true })}
            className={inputClass} aria-invalid={!!errors.total_cost} />
        </Field>
        <Field id="already_refunded" label="Already refunded (€)" error={errors.already_refunded?.message}>
          <input id="already_refunded" type="number" step="0.01" min="0" placeholder="0.00"
            {...register('already_refunded', { valueAsNumber: true })}
            className={inputClass} aria-invalid={!!errors.already_refunded} />
        </Field>
      </div>
      <p className="text-[10px] text-slate-400 -mt-3">Amounts in EUR. Enter 0 if nothing has been refunded yet.</p>

      {/* Description with character count */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          placeholder="Describe the circumstances of your trip cancellation in detail…"
          {...register('description')}
          className={`${inputClass} resize-none`}
          aria-invalid={!!errors.description}
        />
        <div className="flex justify-between items-start">
          {errors.description
            ? <p className="text-xs text-red-600">{errors.description.message}</p>
            : <span />}
          <p className={`text-[10px] tabular-nums ${descriptionLength >= 30 ? 'text-slate-400' : 'text-amber-600'}`}>
            {descriptionLength >= 30
              ? `${descriptionLength} chars`
              : `${descriptionLength} / 30 min`}
          </p>
        </div>
      </div>
    </div>
  )
}
