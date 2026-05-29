'use client'

import { useState, useRef } from 'react'
import { UploadCloud, X, Loader2, CheckCircle2 } from 'lucide-react'
import { uploadDocument } from '@/lib/storage'
import type { DocumentSlot as SlotConfig } from '@/lib/documentSlots'

interface UploadedFile {
  file_url: string
  file_name: string
}

interface Props {
  slot: SlotConfig
  tempClaimId: string
  value: UploadedFile | undefined
  onChange: (value: UploadedFile | undefined) => void
  error?: string
}

export function DocumentSlot({ slot, tempClaimId, value, onChange, error }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setUploadError('File must be under 10 MB'); return }

    setUploading(true)
    setUploadError(undefined)
    try {
      const result = await uploadDocument(file, tempClaimId, slot.id)
      onChange(result)
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (value) {
    return (
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
        error
          ? 'border-red-200 bg-red-50'
          : 'border-emerald-200 bg-emerald-50'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{slot.label}</p>
            <p className="text-xs text-slate-500 truncate">{value.file_name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="ml-3 p-1.5 rounded-full hover:bg-slate-200 shrink-0 transition-colors"
          aria-label={`Remove ${slot.label}`}
        >
          <X size={13} className="text-slate-500" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className={`flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all group ${
        error
          ? 'border-red-300 bg-red-50 hover:bg-red-50/80'
          : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'
      }`}>
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-colors ${
          error ? 'bg-red-100' : 'bg-slate-100 group-hover:bg-indigo-100'
        }`}>
          {uploading
            ? <Loader2 size={16} className="animate-spin text-indigo-500" />
            : <UploadCloud size={16} className={error ? 'text-red-500' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700">
            {slot.label}
            {slot.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{slot.description}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">PDF, JPG, PNG · max 10 MB</p>
        </div>

        <span className={`hidden sm:block text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 border transition-all ${
          error
            ? 'text-red-600 border-red-200 bg-red-50'
            : 'text-slate-500 border-slate-200 bg-white group-hover:text-indigo-600 group-hover:border-indigo-200 group-hover:bg-indigo-50'
        }`}>
          Browse
        </span>

        <input ref={inputRef} type="file" accept={slot.accept} className="hidden" onChange={handleFile} disabled={uploading} />
      </label>

      {(uploadError || error) && (
        <p className="text-xs text-red-600 mt-1.5 pl-1">{uploadError || error}</p>
      )}
    </div>
  )
}
