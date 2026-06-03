'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Loader2, FileText, Paperclip,
  TrendingUp, TrendingDown, HelpCircle, Info,
  Database, ShieldCheck, FileSearch, Scale, Zap, BookOpen, Check,
} from 'lucide-react'
import { ClaimResult } from '@/components/ClaimResult'
import { useClaimStatus } from '@/hooks/useClaimStatus'
import { submitDemoClaim } from '@/lib/api'
import { getDemoProfiles, type DemoProfile } from '@/lib/demoProfiles'

// ── Pipeline step definitions ─────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    icon: Database,
    label: 'Policy retrieval',
    waitingDetail: 'Fetch policy schedule from insurer',
    activeDetail: 'Reading policy schedule, limits, and claim history…',
    doneDetail: 'Policy schedule loaded',
  },
  {
    icon: ShieldCheck,
    label: 'Eligibility checks',
    waitingDetail: 'Run deterministic rule engine',
    activeDetail: 'Checking policy status, filing window, and net claim…',
    doneDetail: 'Eligibility rules passed',
  },
  {
    icon: FileSearch,
    label: 'Evidence analysis',
    waitingDetail: 'AI examiner extracts facts from documents',
    activeDetail: 'Extracting facts, flagging mismatches and missing documents…',
    doneDetail: 'Evidence report produced',
  },
  {
    icon: Scale,
    label: 'Policy adjudication',
    waitingDetail: 'AI adjudicator applies policy to evidence report',
    activeDetail: 'Interpreting policy wording against the structured evidence…',
    doneDetail: 'Coverage decision reached',
  },
  {
    icon: Zap,
    label: 'Structured decision',
    waitingDetail: 'Generate confidence score and decision',
    activeDetail: 'Producing confidence score and structured outcome…',
    doneDetail: 'Decision generated',
  },
  {
    icon: BookOpen,
    label: 'Audit trail',
    waitingDetail: 'Write decision record to database',
    activeDetail: 'Saving both pass outputs and full audit record…',
    doneDetail: 'Audit record saved',
  },
]

// ── Hook: step-by-step progression ───────────────────────────────────────────
//
// Steps 0–1 advance on fixed timers (backend completes them in milliseconds).
// Step 2 (evidence analysis, Haiku) advances after ~6s — a conservative estimate
// for the first LLM pass. Step 3 (policy adjudication, Sonnet) stays active
// until isFinalStatus is true. Steps 4–5 then complete quickly.

function usePipelineStep(claimId: string | null, isFinalStatus: boolean): number {
  const [step, setStep] = useState(-1)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const submittedAt = useRef<number>(0)

  function clearAll() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // Start auto-progression when a claim is submitted
  useEffect(() => {
    if (!claimId) { setStep(-1); return }
    clearAll()
    submittedAt.current = Date.now()
    setStep(0)
    timers.current.push(setTimeout(() => setStep(s => Math.max(s, 1)), 1200))  // eligibility checks
    timers.current.push(setTimeout(() => setStep(s => Math.max(s, 2)), 2800))  // evidence analysis
    timers.current.push(setTimeout(() => setStep(s => Math.max(s, 3)), 9000))  // policy adjudication (~6s for pass 1)
    return clearAll
  }, [claimId])

  // Complete remaining steps when the real result arrives.
  // For fast rule-engine rejections the result lands within seconds, so we
  // enforce a minimum elapsed time before starting the completion sequence —
  // this ensures the early steps have had enough visible dwell time.
  useEffect(() => {
    if (!isFinalStatus || !claimId) return
    const elapsed = Date.now() - submittedAt.current
    const delay = Math.max(0, 3000 - elapsed)
    const t = setTimeout(() => {
      clearAll()
      setStep(s => Math.max(s, 3))
      timers.current.push(setTimeout(() => setStep(s => Math.max(s, 4)), 700))   // structured decision
      timers.current.push(setTimeout(() => setStep(s => Math.max(s, 5)), 1400))  // audit trail
      timers.current.push(setTimeout(() => setStep(s => Math.max(s, 6)), 2100))  // all done
    }, delay)
    timers.current.push(t)
    return clearAll
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinalStatus])

  return step
}

// ── Pipeline progress card ────────────────────────────────────────────────────

function PipelineProgress({ step, claimId }: { step: number; claimId: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <Loader2 size={13} className="text-indigo-500 animate-spin shrink-0" />
        <p className="text-xs font-semibold text-slate-700">Pipeline running</p>
        <span className="ml-auto text-[10px] text-slate-400 font-mono tracking-tight">{claimId}</span>
      </div>

      {/* Steps */}
      <div className="px-5 py-4">
        {PIPELINE_STEPS.map((s, i) => {
          const isDone = i < step
          const isActive = i === step
          const isWaiting = i > step
          const isLast = i === PIPELINE_STEPS.length - 1
          const Icon = s.icon

          return (
            <div key={i} className="flex items-start gap-3">
              {/* Icon + connector */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-400 ${
                    isDone
                      ? 'bg-emerald-500'
                      : isActive
                      ? 'bg-indigo-600'
                      : 'bg-slate-100'
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-indigo-400 opacity-30 animate-ping" />
                  )}
                  {isDone ? (
                    <Check size={13} className="text-white" />
                  ) : (
                    <Icon
                      size={13}
                      className={isActive ? 'text-white' : 'text-slate-400'}
                    />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-[18px] mt-1 transition-colors duration-500 ${
                      isDone ? 'bg-emerald-300' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>

              {/* Label + detail */}
              <div className={`min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                <p
                  className={`text-xs font-semibold leading-tight transition-colors duration-300 ${
                    isDone
                      ? 'text-slate-500'
                      : isActive
                      ? 'text-slate-900'
                      : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </p>
                <p
                  className={`text-[11px] mt-0.5 leading-relaxed transition-colors duration-300 ${
                    isDone
                      ? 'text-emerald-600'
                      : isActive
                      ? 'text-indigo-500'
                      : 'text-slate-400'
                  }`}
                >
                  {isDone ? s.doneDetail : isActive ? s.activeDetail : s.waitingDetail}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Outcome likelihood styling ────────────────────────────────────────────────

const LIKELIHOOD_STYLES = {
  positive: {
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    bar: 'bg-emerald-400',
    icon: TrendingUp,
    iconClass: 'text-emerald-500',
    bannerBorder: 'border-emerald-200 bg-emerald-50',
    bannerTitle: 'text-emerald-800',
    bannerBody: 'text-emerald-700',
  },
  negative: {
    badge: 'bg-red-50 text-red-700 border border-red-200',
    bar: 'bg-red-400',
    icon: TrendingDown,
    iconClass: 'text-red-400',
    bannerBorder: 'border-red-200 bg-red-50',
    bannerTitle: 'text-red-800',
    bannerBody: 'text-red-700',
  },
  uncertain: {
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    bar: 'bg-amber-400',
    icon: HelpCircle,
    iconClass: 'text-amber-500',
    bannerBorder: 'border-amber-200 bg-amber-50',
    bannerTitle: 'text-amber-800',
    bannerBody: 'text-amber-700',
  },
}

const STATUS_PILL: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Expired: 'bg-red-100 text-red-700',
  Suspended: 'bg-red-100 text-red-700',
}

const TIER_PILL: Record<string, string> = {
  Basic: 'bg-slate-100 text-slate-600',
  Classic: 'bg-indigo-50 text-indigo-600',
  Premium: 'bg-violet-50 text-violet-600',
}

const DOC_LABELS: Record<string, string> = {
  physician_statement: 'Physician Statement',
  booking_confirmation: 'Booking Confirmation',
  cancellation_proof: 'Cancellation Proof',
  payment_proof: 'Payment Proof',
  death_certificate: 'Death Certificate',
  redundancy_letter: 'Redundancy Letter',
  official_report: 'Official Report',
  travel_advisory_copy: 'Travel Advisory',
  other: 'Supporting Document',
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  selected,
  onSelect,
}: {
  profile: DemoProfile
  selected: boolean
  onSelect: () => void
}) {
  const lh = LIKELIHOOD_STYLES[profile.likelihoodLevel]
  const Icon = lh.icon

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border bg-white overflow-hidden transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        selected
          ? 'border-indigo-300 ring-2 ring-indigo-500 ring-offset-2 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className={`h-1 w-full ${lh.bar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{profile.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{profile.subtitle}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${lh.badge}`}>
            <Icon size={10} className={lh.iconClass} />
            {profile.likelihoodLabel}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{profile.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {profile.payload.attachments.map((att) => (
            <span
              key={att.file_name}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5"
            >
              <FileText size={9} className="shrink-0" />
              {DOC_LABELS[att.document_type] ?? att.document_type}
            </span>
          ))}
        </div>
        {selected && (
          <div className="mt-3 flex items-center gap-1.5 text-indigo-600">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-xs font-medium">Selected</span>
          </div>
        )}
      </div>
    </button>
  )
}

// ── Policy panel ──────────────────────────────────────────────────────────────

function PolicyPanel({ profile }: { profile: DemoProfile }) {
  const p = profile.policyDetails
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <ShieldCheck size={13} className="text-slate-400" />
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Policy details
        </p>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Policy No.</p>
          <p className="text-xs font-semibold text-slate-800 font-mono">{p.policyNumber}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Holder</p>
          <p className="text-xs font-semibold text-slate-800">{p.holder}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Status</p>
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[p.status]}`}>
            {p.status}
          </span>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Tier</p>
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIER_PILL[p.tier]}`}>
            {p.tier}
          </span>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Trip cancel limit</p>
          <p className="text-xs font-semibold text-slate-800">{p.tripCancellationLimit}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Deductible</p>
          <p className="text-xs font-semibold text-slate-800">{p.deductible}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Claims (12 mo)</p>
          <p className={`text-xs font-semibold ${p.priorClaims12Months > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {p.priorClaims12Months === 0 ? 'None' : `${p.priorClaims12Months} claim${p.priorClaims12Months > 1 ? 's' : ''}`}
          </p>
        </div>
        {p.note && (
          <div className="col-span-2 sm:col-span-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Note</p>
            <p className="text-xs text-slate-600 italic">{p.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Attachments panel ─────────────────────────────────────────────────────────

function AttachmentsPanel({ profile }: { profile: DemoProfile }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Paperclip size={13} className="text-slate-400" />
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Attachments ({profile.payload.attachments.length})
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {profile.payload.attachments.map((att) => (
          <div key={att.file_name} className="px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={13} className="text-indigo-400 shrink-0" />
              <span className="text-xs font-medium text-slate-700 truncate">
                {DOC_LABELS[att.document_type] ?? att.document_type}
              </span>
              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">{att.file_name}</span>
            </div>
            <a
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View PDF
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Likelihood banner ─────────────────────────────────────────────────────────

function LikelihoodBanner({ profile }: { profile: DemoProfile }) {
  const lh = LIKELIHOOD_STYLES[profile.likelihoodLevel]
  const Icon = lh.icon
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${lh.bannerBorder}`}>
      <Icon size={15} className={`mt-0.5 shrink-0 ${lh.iconClass}`} />
      <div>
        <p className={`text-xs font-semibold mb-0.5 ${lh.bannerTitle}`}>{profile.likelihoodLabel}</p>
        <p className={`text-xs leading-relaxed ${lh.bannerBody}`}>{profile.likelihoodHint}</p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const profiles = getDemoProfiles()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [claimId, setClaimId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: claimStatus } = useClaimStatus(claimId)

  const isFinalStatus = !!(
    claimStatus && !['pending', 'processing'].includes(claimStatus.status)
  )
  const pipelineStep = usePipelineStep(claimId, isFinalStatus)
  const allStepsDone = pipelineStep >= PIPELINE_STEPS.length

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null

  function selectProfile(id: string) {
    setSelectedId(id)
    setClaimId(null)
    setError(null)
  }

  async function handleSubmit() {
    if (!selectedProfile) return
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await submitDemoClaim(selectedProfile.id)
      setClaimId(result.claim_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit demo claim')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-24">

        {/* Header */}
        <div className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium px-3.5 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Live pipeline · Real LLM · Real API calls
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            See the pipeline{' '}
            <span className="text-gradient">in action</span>
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Select one of the four pre-built claimant profiles. Each has real documents stored
            in Supabase — the claim flows through the full adjudication pipeline and you watch
            every step live before the AI decision arrives.
          </p>
        </div>

        {/* Profile cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              selected={selectedId === profile.id}
              onSelect={() => selectProfile(profile.id)}
            />
          ))}
        </div>

        {/* Selected profile detail panels */}
        {selectedProfile && !claimId && (
          <div className="mb-8 space-y-3">
            <LikelihoodBanner profile={selectedProfile} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PolicyPanel profile={selectedProfile} />
              <AttachmentsPanel profile={selectedProfile} />
            </div>
            <div className="flex items-start gap-2 px-1">
              <Info size={12} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This is a live AI call — the actual outcome may differ from the indication above
                depending on how the model interprets the documents and policy wording.
              </p>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedProfile || isSubmitting || !!claimId}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-[0_4px_16px_rgba(99,102,241,0.35)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit Demo Claim
                <ArrowRight size={15} />
              </>
            )}
          </button>
          {!selectedProfile && !claimId && (
            <p className="text-xs text-slate-400">Select a profile above to continue</p>
          )}
        </div>

        {/* Submission error */}
        {error && (
          <div className="mt-6 max-w-xl mx-auto rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pipeline progress → result */}
        {claimId && (
          <div className="mt-10 max-w-xl mx-auto">
            {!allStepsDone ? (
              <>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Processing
                </p>
                <PipelineProgress step={pipelineStep} claimId={claimId} />
              </>
            ) : claimStatus ? (
              <>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Decision
                </p>
                <ClaimResult data={claimStatus} />
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => { setClaimId(null); setSelectedId(null) }}
                    className="text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
                  >
                    ← Try another scenario
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">Ready to process a real claim?</p>
          <div className="flex gap-3">
            <Link
              href="/submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Submit a claim <ArrowRight size={13} />
            </Link>
            <Link
              href="/status"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 transition-all"
            >
              Track claim
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
