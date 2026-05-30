'use client'

import { useEffect, useRef } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { submitClaim } from '@/lib/api'
import { getSlotsForReason } from '@/lib/documentSlots'
import { CLAIM_TYPES } from '@/lib/claimTypes'
import { claimFormSchema, type ClaimFormValues } from './schema'
import { StepPersonalDetails } from './StepPersonalDetails'
import { StepInsuranceDetails } from './StepInsuranceDetails'
import { StepDocuments } from './StepDocuments'
import { StepReview } from './StepReview'

const STEP_TITLES = ['Personal details', 'Trip details', 'Documents', 'Review & submit']

const STEP_FIELDS: Record<number, (keyof ClaimFormValues)[]> = {
  1: ['full_name', 'email', 'phone', 'policy_number'],
  2: [
    'departure_date', 'return_date', 'destination_country', 'booking_reference',
    'cancellation_reason', 'cancellation_date', 'aware_of_reason_date',
    'total_cost', 'already_refunded', 'description',
  ],
  3: [],
  4: [],
}

interface Props {
  claimType?: string
}

export function ClaimForm({ claimType }: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [docError, setDocError] = useState<string>()
  const [submitError, setSubmitError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const claimTypeLabel = CLAIM_TYPES.find((ct) => ct.id === claimType)?.label

  const tempClaimId = useRef(crypto.randomUUID()).current

  const methods = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      already_refunded: 0,
      attachments: {},
      confirmation: false,
    },
    mode: 'onTouched',
  })

  const { trigger, handleSubmit, watch, formState } = methods

  // Warn on navigate if the user has entered data
  useEffect(() => {
    if (!formState.isDirty) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formState.isDirty])

  async function handleNext() {
    const fields = STEP_FIELDS[currentStep]
    if (fields.length > 0) {
      const valid = await trigger(fields as (keyof ClaimFormValues)[])
      if (!valid) return
    }

    if (currentStep === 3) {
      const reason = watch('cancellation_reason')
      const slots = getSlotsForReason(reason)
      const missingRequired = slots.filter(
        (s) => s.required && !watch(`attachments.${s.id}` as keyof ClaimFormValues)
      )
      if (missingRequired.length > 0) {
        setDocError(`Please upload: ${missingRequired.map((s) => s.label).join(', ')}`)
        return
      }
      setDocError(undefined)
    }

    setCurrentStep((s) => s + 1)
  }

  function handleBack() {
    setCurrentStep((s) => s - 1)
    setSubmitError(undefined)
  }

  const onSubmit = async (data: ClaimFormValues) => {
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      const { confirmation: _confirmation, ...claimData } = data
      const attachmentsArray = Object.entries(claimData.attachments ?? {})
        .filter(([, val]) => val !== undefined)
        .map(([docType, val]) => ({
          document_type: docType,
          file_url: val!.file_url,
          file_name: val!.file_name,
        }))

      const result = await submitClaim({
        ...claimData,
        total_cost: Number(claimData.total_cost),
        already_refunded: Number(claimData.already_refunded ?? 0),
        attachments: attachmentsArray,
      })

      sessionStorage.setItem('lastClaimId', result.claim_id)
      router.push(`/status?id=${result.claim_id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit claim')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEP_TITLES.map((title, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isActive = stepNum === currentStep

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 ${
                    isCompleted
                      ? 'bg-indigo-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.35)]'
                      : isActive
                      ? 'bg-indigo-50 border-2 border-indigo-400 text-indigo-600'
                      : 'bg-white border border-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check size={13} strokeWidth={2.5} /> : stepNum}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap tracking-wide transition-colors ${
                    isActive
                      ? 'text-slate-800'
                      : isCompleted
                      ? 'text-slate-500 hidden sm:block'
                      : 'text-slate-400 hidden sm:block'
                  }`}
                >
                  {title}
                </span>
              </div>
              {i < STEP_TITLES.length - 1 && (
                <div
                  className={`flex-1 h-px mx-3 mb-5 transition-colors duration-300 ${
                    stepNum < currentStep ? 'bg-indigo-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-4 sm:px-7 sm:py-5 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">{STEP_TITLES[currentStep - 1]}</h2>
            {claimTypeLabel && (
              <span className="shrink-0 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                {claimTypeLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Step {currentStep} of {STEP_TITLES.length}</p>
        </div>

        <div className="px-4 py-5 sm:px-7 sm:py-7">
          <FormProvider {...methods}>
            <div>
              <div className="min-h-[300px]">
                {currentStep === 1 && <StepPersonalDetails />}
                {currentStep === 2 && <StepInsuranceDetails />}
                {currentStep === 3 && <StepDocuments tempClaimId={tempClaimId} docError={docError} />}
                {currentStep === 4 && <StepReview />}
              </div>

              {submitError && (
                <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-7 pt-5 border-t border-slate-100">
                {currentStep === 1 ? (
                  <Link
                    href="/submit"
                    className="px-5 py-2 text-sm font-medium text-slate-500 rounded-full hover:text-slate-800 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-medium text-slate-500 rounded-full hover:text-slate-800 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Back
                  </button>
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-500 transition-colors shadow-[0_4px_14px_rgba(99,102,241,0.3)]"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={submitting || !watch('confirmation')}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-500 transition-colors shadow-[0_4px_14px_rgba(99,102,241,0.3)] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {submitting ? 'Submitting…' : 'Confirm & send claim'}
                  </button>
                )}
              </div>
            </div>
          </FormProvider>
        </div>
      </div>
    </div>
  )
}
