import { Suspense } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { StatusContent } from "@/components/StatusContent"

export default function StatusPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-14">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 mb-5">
            <ShieldCheck size={22} className="text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Claim status
          </h1>
          <p className="mt-3 text-slate-500 text-[15px] max-w-sm">
            Enter your claim reference number to view the current status and decision details.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-indigo-500" size={22} />
            </div>
          }
        >
          <StatusContent />
        </Suspense>
      </div>
    </div>
  )
}
