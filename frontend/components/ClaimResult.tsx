import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ClaimStatusResponse } from '@/types/claim'

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
    label: 'More info needed',
    heading: 'text-orange-800',
    body: 'text-orange-700',
  },
}

export function ClaimResult({ data, onRefresh }: Props) {
  const { claim_id, status, decision_summary, approved_amount, created_at, updated_at } = data
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

      <div className="h-px bg-slate-200 mx-6" />

      {/* Body */}
      <div className="px-6 py-5 space-y-5">
        {/* Approved amount */}
        {status === 'approved' && approved_amount != null && (
          <div className="flex items-center justify-between bg-emerald-100 border border-emerald-200 rounded-xl px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest mb-1">Approved payout</p>
              <p className="text-3xl font-bold text-emerald-800">{formatCurrency(approved_amount)}</p>
            </div>
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
        )}

        {/* Summary */}
        {decision_summary && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Assessment</p>
            <p className={`text-sm leading-relaxed ${cfg.body}`}>{decision_summary}</p>
          </div>
        )}

        {/* Pending */}
        {isPending && !decision_summary && (
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
        )}

        {/* Needs more info */}
        {status === 'needs_more_info' && (
          <p className={`text-sm leading-relaxed ${cfg.body}`}>
            Your claim has been referred for manual review. An adjuster may contact you to request additional documents or clarification.
            If you have questions, email{' '}
            <a href="mailto:support@travelguard.com" className="underline underline-offset-2">
              support@travelguard.com
            </a>
            {' '}with your claim reference.
          </p>
        )}

        {/* Failed */}
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
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Submitted</p>
            <p className="text-xs font-medium text-slate-600">{formatTimestamp(created_at)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Last updated</p>
            <p className="text-xs font-medium text-slate-600">{formatTimestamp(updated_at)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-center">
          <Link
            href="/submit"
            className="text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
          >
            Submit another claim →
          </Link>
        </div>
      </div>
    </div>
  )
}
