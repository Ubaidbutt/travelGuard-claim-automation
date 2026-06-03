'use client'

import Link from 'next/link'
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw,
  HelpCircle, FileWarning, ListChecks, ChevronRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ClaimStatusResponse, ClaimFeedback } from '@/types/claim'

interface Props {
  data: ClaimStatusResponse
  onRefresh?: () => void
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS = {
  approved: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    label: 'Approved',
    heading: 'text-emerald-800',
    body: 'text-emerald-700',
  },
  rejected: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    icon: XCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    badge: 'bg-red-100 text-red-700 border border-red-200',
    label: 'Not approved',
    heading: 'text-red-800',
    body: 'text-red-700',
  },
  failed: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    label: 'Processing error',
    heading: 'text-amber-800',
    body: 'text-amber-700',
  },
  pending: {
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
    icon: Clock,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    label: 'Under review',
    heading: 'text-indigo-800',
    body: 'text-indigo-700',
  },
  processing: {
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
    icon: Clock,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    label: 'Processing',
    heading: 'text-indigo-800',
    body: 'text-indigo-700',
  },
  needs_more_info: {
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    icon: HelpCircle,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700 border border-orange-200',
    label: 'Under manual review',
    heading: 'text-orange-800',
    body: 'text-orange-700',
  },
}

const QUALITY_STYLE: Record<string, string> = {
  strong: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  adequate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  weak: 'bg-amber-100 text-amber-700 border-amber-200',
  insufficient: 'bg-red-100 text-red-700 border-red-200',
}

const TIPS = [
  'Submit original documents directly from the source — airline e-tickets, hotel invoices, and physician certificates on official letterhead.',
  'Ensure the claimant name, travel dates, and amounts match exactly across all documents.',
  'A physician statement must include the diagnosis, treatment dates, and an explicit statement of inability to travel.',
  'File within 90 days of your cancellation date.',
  'Include full payment receipts — partial receipts or bank statements alone are not sufficient.',
  'For job loss claims, the redundancy letter must be on company letterhead and signed by an authorised signatory.',
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="h-px bg-slate-200" />
}

function TipsSection({ title }: { title: string }) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <ul className="space-y-2">
        {TIPS.map((tip, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-slate-600">
            <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeedbackSection({ feedback }: { feedback: ClaimFeedback }) {
  const qualityStyle = QUALITY_STYLE[feedback.evidence_quality] ?? QUALITY_STYLE.weak
  const hasMissing = feedback.missing_documents.length > 0
  const hasDiscrepancies = feedback.discrepancies.length > 0
  const hasComplianceNote = feedback.compliance_notes.trim().length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SectionLabel>Why your claim wasn&apos;t approved</SectionLabel>
      </div>

      {/* Evidence quality */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Evidence quality:</span>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${qualityStyle}`}>
          {feedback.evidence_quality || 'unknown'}
        </span>
      </div>

      {/* Reason not covered */}
      {!feedback.reason_covered && (
        <div className="flex gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100">
          <FileWarning size={14} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            Your cancellation reason is not listed as a covered event under this policy.
          </p>
        </div>
      )}

      {/* Missing documents */}
      {hasMissing && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1.5">Missing or insufficient documents:</p>
          <ul className="space-y-1">
            {feedback.missing_documents.map((doc, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <XCircle size={13} className="mt-0.5 shrink-0 text-red-400" />
                <span>{doc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Discrepancies */}
      {hasDiscrepancies && (
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1.5">Document discrepancies found:</p>
          <ul className="space-y-1">
            {feedback.discrepancies.map((d, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Policy compliance note */}
      {hasComplianceNote && (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Policy assessment</p>
          <p className="text-sm text-slate-600 leading-relaxed">{feedback.compliance_notes}</p>
        </div>
      )}
    </div>
  )
}

export function ClaimResult({ data, onRefresh }: Props) {
  const { claim_id, status, decision_summary, approved_amount, created_at, updated_at, feedback } = data
  const cfg = STATUS[status as keyof typeof STATUS] ?? STATUS.pending
  const Icon = cfg.icon
  const isPending = status === 'pending' || status === 'processing'

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} overflow-hidden shadow-card`}>
      {/* Header */}
      <div className="px-6 py-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${cfg.iconBg} shrink-0 ${isPending ? 'animate-pulse' : ''}`}>
            <Icon size={20} className={cfg.iconColor} />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mb-0.5">Claim reference</p>
            <p className="text-base font-bold text-slate-900 font-mono tracking-tight">{claim_id}</p>
          </div>
        </div>
        <span className={`shrink-0 mt-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      <Divider />

      <div className="px-6 py-5 space-y-6">

        {/* ── APPROVED ── */}
        {status === 'approved' && (
          <>
            {approved_amount != null && (
              <div className="flex items-center justify-between bg-emerald-100 border border-emerald-200 rounded-xl px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest mb-1">Approved payout</p>
                  <p className="text-3xl font-bold text-emerald-800">{formatCurrency(approved_amount)}</p>
                </div>
                <CheckCircle2 size={36} className="text-emerald-400" />
              </div>
            )}
            {decision_summary && (
              <div>
                <SectionLabel>Assessment</SectionLabel>
                <p className={`text-sm leading-relaxed ${cfg.body}`}>{decision_summary}</p>
              </div>
            )}
            <div>
              <SectionLabel>What happens next</SectionLabel>
              <ol className="space-y-3">
                {[
                  'Payment will be processed within 5–10 business days to your nominated account.',
                  'A confirmation email with full payment details will be sent to your registered address.',
                  'If you have questions, email support@travelguard.com quoting your claim reference above.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-600">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        {/* ── REJECTED ── */}
        {status === 'rejected' && (
          <>
            {decision_summary && (
              <div>
                <SectionLabel>Assessment</SectionLabel>
                <p className={`text-sm leading-relaxed ${cfg.body}`}>{decision_summary}</p>
              </div>
            )}
            {feedback && (
              <>
                <Divider />
                <FeedbackSection feedback={feedback} />
              </>
            )}
            <Divider />
            <TipsSection title="Tips for a stronger resubmission" />
            <div className="pt-1">
              <Link
                href="/submit"
                className="inline-flex items-center justify-center w-full gap-2 rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <ListChecks size={15} />
                Submit a new claim
              </Link>
            </div>
          </>
        )}

        {/* ── NEEDS MORE INFO ── */}
        {status === 'needs_more_info' && (
          <>
            {approved_amount != null && (
              <div className="flex items-center justify-between bg-orange-100 border border-orange-200 rounded-xl px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold text-orange-700 uppercase tracking-widest mb-1">Provisional amount — pending manual sign-off</p>
                  <p className="text-3xl font-bold text-orange-800">{formatCurrency(approved_amount)}</p>
                </div>
                <HelpCircle size={36} className="text-orange-300" />
              </div>
            )}
            {decision_summary && (
              <div>
                <SectionLabel>Assessment</SectionLabel>
                <p className={`text-sm leading-relaxed ${cfg.body}`}>{decision_summary}</p>
              </div>
            )}
            <div>
              <SectionLabel>What an adjuster will review</SectionLabel>
              <ul className="space-y-2">
                {[
                  'Authenticity and completeness of all submitted documents',
                  'Consistency of names, dates, and amounts across documents',
                  'Policy coverage conditions specific to your cancellation reason',
                  'Any additional evidence or clarification you can provide',
                ].map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                    <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-slate-500">
              An adjuster will contact you. If you have questions in the meantime, email{' '}
              <a href="mailto:support@travelguard.com" className="text-orange-700 underline underline-offset-2 font-medium">
                support@travelguard.com
              </a>
              {' '}with your claim reference.
            </p>
          </>
        )}

        {/* ── PENDING / PROCESSING ── */}
        {isPending && (
          <>
            <div>
              <p className={`text-sm leading-relaxed ${cfg.body}`}>
                Your claim has been received and is being reviewed. This typically takes a few minutes — this page refreshes automatically.
              </p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors"
                >
                  <RefreshCw size={13} />
                  Refresh now
                </button>
              )}
            </div>
            <Divider />
            <TipsSection title="While you wait — tips for successful claims" />
          </>
        )}

        {/* ── FAILED ── */}
        {status === 'failed' && (
          <p className={`text-sm leading-relaxed ${cfg.body}`}>
            An error occurred while processing your claim. Please contact{' '}
            <a href="mailto:support@travelguard.com" className="underline underline-offset-2">
              support@travelguard.com
            </a>
            {' '}quoting your claim reference above.
          </p>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Submitted</p>
            <p className="text-xs font-medium text-slate-600">{formatTimestamp(created_at)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Last updated</p>
            <p className="text-xs font-medium text-slate-600">{formatTimestamp(updated_at)}</p>
          </div>
        </div>

        {/* Footer link — only on non-rejected statuses (rejected has its own CTA) */}
        {status !== 'rejected' && (
          <div className="flex justify-center">
            <Link
              href="/submit"
              className="text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
            >
              Submit another claim →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
