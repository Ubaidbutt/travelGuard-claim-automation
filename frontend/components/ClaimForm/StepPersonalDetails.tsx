'use client'

import { useFormContext } from 'react-hook-form'
import type { ClaimFormValues } from './schema'

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

const inputClass =
  'input-dark w-full aria-invalid:border-red-400 aria-invalid:ring-2 aria-invalid:ring-red-500/15'

export function StepPersonalDetails() {
  const { register, formState: { errors } } = useFormContext<ClaimFormValues>()

  return (
    <div className="space-y-5">
      <Field id="full_name" label="Full name" error={errors.full_name?.message}>
        <input id="full_name" {...register('full_name')} placeholder="Jane Smith"
          className={inputClass} aria-invalid={!!errors.full_name} />
      </Field>

      <Field id="email" label="Email registered with your insurer" error={errors.email?.message}>
        <input id="email" type="email" {...register('email')} placeholder="jane@example.com"
          className={inputClass} aria-invalid={!!errors.email} />
      </Field>

      <Field id="date_of_birth" label="Date of birth" error={errors.date_of_birth?.message}>
        <input id="date_of_birth" type="date" {...register('date_of_birth')}
          className={inputClass} aria-invalid={!!errors.date_of_birth} />
      </Field>

      <Field id="phone" label="Phone number" error={errors.phone?.message}>
        <input id="phone" type="tel" {...register('phone')} placeholder="+44 7700 900000"
          className={inputClass} aria-invalid={!!errors.phone} />
      </Field>

      <Field id="policy_number" label="Policy number" error={errors.policy_number?.message}>
        <input id="policy_number" {...register('policy_number')} placeholder="POL-7823419"
          className={inputClass} aria-invalid={!!errors.policy_number} />
      </Field>
    </div>
  )
}
