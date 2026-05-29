import Link from "next/link"
import {
  ShieldCheck, Users, BarChart3, FileSearch, Layers, ArrowRight, Clock, Mail,
} from "lucide-react"
import { CLAIM_TYPES } from "@/lib/claimTypes"

const stats = [
  { value: "75%", label: "Faster resolution" },
  { value: "30–40%", label: "Lower cost per claim" },
  { value: "70–90%", label: "Straight-through rate" },
  { value: "< 60s", label: "Typical decision time" },
]

const pipeline = [
  { step: "01", title: "Policy retrieval", body: "The claimant's policy schedule is fetched from the insurer's systems — tier, limits, purchase date, and claim history." },
  { step: "02", title: "Eligibility checks", body: "Deterministic rules run first: policy status, filing window, foreseeable event test, net claim value. Clear rejections are resolved immediately." },
  { step: "03", title: "Intelligent document assessment", body: "The system reads the actual policy wording and all uploaded proof. It extracts facts, cross-references them against the claim, and assesses coverage compliance." },
  { step: "04", title: "Structured decision", body: "A validated decision is produced — approved, rejected, or referred — with a confidence score, approved amount, and plain-language summary." },
  { step: "05", title: "Full audit trail", body: "Every status transition and decision outcome is logged. Adjusters get a complete structured summary for every case, whether automated or human-reviewed." },
]

const features = [
  { icon: FileSearch, title: "Policy wording as source of truth", body: "The system reasons against the actual policy document, not a pre-extracted rule list. Coverage decisions reflect the precise wording in effect at purchase." },
  { icon: ShieldCheck, title: "Deterministic rule enforcement", body: "Eligibility checks, filing windows, and coverage caps are enforced by a rule engine that operates independently of the AI layer — always auditable." },
  { icon: Users, title: "Human-in-the-loop routing", body: "Low-confidence and high-risk cases are escalated with a full decision summary. Your team focuses only on cases that need human judgment." },
  { icon: BarChart3, title: "Compliance-ready audit trail", body: "Every decision outcome, rule result, and status transition is logged with timestamps. Built to meet the evidential requirements of regulated claims handling." },
  { icon: Layers, title: "Insurer integration layer", body: "Each insurer connects via a dedicated adapter. Adding a new insurer or claim type does not change the core processing pipeline." },
]

export default function Home() {
  return (
    <div className="bg-slate-50">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 bg-grid opacity-100"
          style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%)" }}
        />
        {/* Soft colour glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-indigo-400/8 blur-[80px] rounded-full" />
        <div className="absolute top-10 left-1/4 w-[300px] h-[200px] bg-sky-400/6 blur-[60px] rounded-full" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium px-3.5 py-1.5 rounded-full mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Travel insurance · AI claims adjudication
            </div>

            <h1 className="text-5xl sm:text-[60px] font-bold text-slate-900 tracking-tight leading-[1.06]">
              Claims decided in{" "}
              <span className="text-gradient">seconds,</span>
              <br />not days.
            </h1>

            <p className="mt-6 text-slate-600 text-lg leading-relaxed max-w-xl">
              An intelligent claims processing platform for travel insurers. It handles document review, policy compliance, and decision-making automatically — escalating only the cases that genuinely need a human adjuster.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="mailto:hello@travelguard.com"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-[0_4px_16px_rgba(99,102,241,0.35)]"
              >
                Request a demo
                <ArrowRight size={15} />
              </a>
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                Submit a claim
              </Link>
              <Link
                href="/status"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                Check claim status
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-slate-900">{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] text-slate-400 pb-4">Figures are estimated based on pilot data. Results may vary.</p>
      </section>

      {/* ── Claim Types ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-3">Travel insurance claims we cover</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight max-w-lg">
            Comprehensive coverage, starting with cancellation.
          </h2>
          <p className="mt-3 text-sm text-slate-500 max-w-xl">
            We&apos;re building AI-automated adjudication across every major travel insurance claim type. Trip cancellation is live now — additional claim types are in development.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CLAIM_TYPES.map((ct) => {
            const Icon = ct.icon
            return (
              <div
                key={ct.label}
                className={`group relative rounded-2xl border bg-white p-6 shadow-card transition-all ${
                  ct.available
                    ? "border-slate-200 hover:border-indigo-300 hover:shadow-card-hover cursor-default"
                    : "border-slate-200 opacity-70"
                }`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border mb-4 ${ct.iconClass}`}>
                  <Icon size={18} />
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">{ct.label}</h3>
                  {ct.available ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      In development
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-slate-500">{ct.description}</p>
                {ct.available && (
                  <Link
                    href="/submit"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    File a claim <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-20 grid gap-12 lg:grid-cols-2 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-4">The problem</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
              A typical travel claim takes 3–10 business days. Most of that time is a human reading a form.
            </h2>
          </div>
          <div className="space-y-5 pt-1">
            <p className="text-sm leading-relaxed text-slate-600">
              Decision quality varies between adjusters, there is no structured reasoning trail, and cost per claim is high. Existing enterprise solutions target large carriers with long sales cycles — leaving mid-size and regional insurers with no viable alternative.
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              Most straightforward claims — especially trip cancellation — are highly rule-based. The majority can be handled automatically, with only genuinely ambiguous cases escalated.
            </p>
            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-700 italic leading-relaxed">
                &ldquo;We process straightforward claims automatically, route complex ones with a full reasoning summary, and give you an audit trail on every decision.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-12">How it works</p>
          <div className="relative">
            <div className="absolute left-[17px] top-2 bottom-2 w-px bg-slate-200 hidden sm:block" />
            <div className="space-y-5">
              {pipeline.map((p, i) => (
                <div key={p.step} className="sm:pl-12 relative group">
                  <div className="hidden sm:flex absolute left-0 top-0.5 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-xs font-bold text-indigo-600 group-hover:border-indigo-300 group-hover:bg-indigo-50 transition-all shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-card group-hover:border-indigo-200 group-hover:shadow-card-hover transition-all">
                    <p className="text-sm font-semibold text-slate-900 mb-1">{p.title}</p>
                    <p className="text-sm leading-relaxed text-slate-500">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-12 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-2">Built for insurers</p>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight max-w-md">
                Accurate, auditable, and ready for regulated environments.
              </h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-card hover:border-indigo-200 hover:bg-white hover:shadow-card-hover transition-all cursor-default"
                >
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 mb-4 group-hover:bg-indigo-100 transition-colors">
                    <Icon size={16} className="text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">{f.body}</p>
                </div>
              )
            })}
          </div>

          {/* Insurer CTA */}
          <div className="mt-12 rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-indigo-900 mb-1">Interested in integrating TravelGuard?</p>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Get in touch to discuss a pilot or integration for your insurer.
              </p>
            </div>
            <a
              href="mailto:hello@travelguard.com"
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm whitespace-nowrap"
            >
              <Mail size={14} />
              Contact us
            </a>
          </div>
        </div>
      </section>

      {/* ── Claimant CTA ── */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 sm:px-12 py-12 grid gap-8 sm:grid-cols-[1fr_auto] items-center shadow-[0_8px_32px_rgba(99,102,241,0.3)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200 mb-3">For claimants</p>
              <h2 className="text-2xl font-bold text-white mb-3">
                Need to file a travel insurance claim?
              </h2>
              <p className="text-sm text-indigo-100 leading-relaxed max-w-md">
                We currently handle trip cancellation claims. Have your policy number and supporting documents ready — the guided form takes around 5 minutes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/submit"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  Start a claim <ArrowRight size={14} />
                </Link>
                <Link
                  href="/status"
                  className="inline-flex items-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:border-white/60 hover:bg-white/10 transition-all"
                >
                  Check existing claim
                </Link>
              </div>
            </div>

            <div className="hidden sm:flex flex-col gap-2.5 min-w-[200px]">
              {[
                { icon: Clock, text: "Decision in under 60 seconds" },
                { icon: ShieldCheck, text: "Policy-accurate assessment" },
                { icon: FileSearch, text: "Document cross-referencing" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-3">
                  <Icon size={14} className="text-indigo-200 shrink-0" />
                  <span className="text-xs text-indigo-100">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
