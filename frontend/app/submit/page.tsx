'use client'

import { useState } from 'react'
import { ClaimForm } from '@/components/ClaimForm'
import { CLAIM_TYPES } from '@/lib/claimTypes'

export default function SubmitPage() {
  const [selectedType, setSelectedType] = useState('trip_cancellation')
  const availableTypes = CLAIM_TYPES.filter((ct) => ct.available)
  const comingSoonTypes = CLAIM_TYPES.filter((ct) => !ct.available)

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-14">

        {/* Claim type selector */}
        <div className="mb-10">
          <div className="text-center mb-7">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Submit a claim
            </h1>
            <p className="mt-2 text-slate-500 text-[15px]">
              Select the type of travel insurance claim you want to file.
            </p>
          </div>

          {/* Available claim types */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {availableTypes.map((ct) => {
              const Icon = ct.icon
              const isSelected = selectedType === ct.id
              return (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setSelectedType(ct.id)}
                  className={`relative flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50 shadow-[0_0_0_2px_rgba(99,102,241,0.2)]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-xl border ${ct.iconClass}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                      {ct.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{ct.shortDescription}</p>
                  </div>
                  <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </button>
              )
            })}
          </div>

          {/* Coming soon claim types */}
          {comingSoonTypes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2 px-0.5">In development</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {comingSoonTypes.map((ct) => {
                  const Icon = ct.icon
                  return (
                    <div
                      key={ct.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 opacity-50"
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg border shrink-0 ${ct.iconClass}`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{ct.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{ct.shortDescription}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Form for selected claim type */}
        {selectedType && <ClaimForm claimType={selectedType} />}
      </div>
    </div>
  )
}
