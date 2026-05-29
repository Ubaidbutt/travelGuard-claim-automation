import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-indigo-600">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="white" />
            </svg>
          </div>
          <span className="text-xs text-slate-500">
            © {year} TravelGuard. All rights reserved.
          </span>
        </div>

        <nav className="flex items-center gap-5">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
            Home
          </Link>
          <Link href="/submit" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
            Submit claim
          </Link>
          <Link href="/status" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
            Track claim
          </Link>
          <a
            href="mailto:hello@travelguard.com"
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  )
}
