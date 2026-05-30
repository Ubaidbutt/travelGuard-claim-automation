'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Search, AlertCircle } from 'lucide-react'
import { ClaimResult } from '@/components/ClaimResult'
import { useClaimStatus } from '@/hooks/useClaimStatus'
import { ClaimNotFoundError } from '@/lib/api'

export function StatusContent() {
  const searchParams = useSearchParams()
  const urlId = searchParams.get('id')

  const [inputValue, setInputValue] = useState(urlId ?? '')
  const [activeId, setActiveId] = useState<string | null>(
    urlId ? urlId.trim().toUpperCase() : null
  )

  const { data, isFetching, error, refetch } = useClaimStatus(activeId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputValue.trim().toUpperCase()
    if (!trimmed) return
    if (trimmed === activeId) {
      refetch()
    } else {
      setActiveId(trimmed)
    }
  }

  const isNotFound = error instanceof ClaimNotFoundError
  const genericErrorMessage = !isNotFound && error
    ? (error instanceof Error ? error.message : 'Failed to fetch claim status')
    : undefined

  return (
    <div className="space-y-5">
      {/* Search card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Look up your claim</p>
          <p className="text-xs text-slate-500 mt-0.5">Enter the reference number from your submission confirmation.</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. CLM-A3F9K2X8"
                autoComplete="off"
                spellCheck={false}
                className="input-dark w-full"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <button
              type="submit"
              disabled={isFetching || !inputValue.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors shadow-[0_4px_14px_rgba(99,102,241,0.3)] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
            >
              {isFetching ? <Loader2 size={14} className="animate-spin" /> : 'Check status'}
            </button>
          </div>
          {genericErrorMessage && <p className="text-xs text-red-600 mt-2.5">{genericErrorMessage}</p>}
        </form>
      </div>

      {/* Claim not found error card */}
      {isNotFound && (
        <div className="rounded-2xl border border-red-200 bg-red-50 overflow-hidden shadow-card">
          <div className="px-6 py-5 flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 shrink-0">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Claim ID not found</p>
              <p className="text-sm text-red-700 mt-1 leading-relaxed">
                We couldn&apos;t find a claim matching <span className="font-mono font-semibold">{activeId}</span>. Please double-check the reference number on your confirmation email and try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {isFetching && !data && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={24} />
          <p className="text-sm text-slate-500">Looking up your claim…</p>
        </div>
      )}

      {data && <ClaimResult data={data} onRefresh={refetch} />}

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have a claim yet?{' '}
        <Link href="/submit" className="text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
          Submit one here.
        </Link>
      </p>
    </div>
  )
}
