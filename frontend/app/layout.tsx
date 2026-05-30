import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TravelGuard Claims",
  description: "AI-powered travel insurance claims adjudication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 font-sans">
        <Providers>
          <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-sm">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)] group-hover:shadow-[0_0_16px_rgba(99,102,241,0.55)] transition-shadow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="white" />
                  </svg>
                </div>
                <span className="text-slate-900 font-semibold text-[15px] tracking-tight">TravelGuard</span>
              </Link>

              <nav className="flex items-center gap-0.5 sm:gap-1">
                <Link href="/" className="hidden sm:block px-3.5 py-1.5 text-sm text-slate-600 font-medium rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-all">
                  Home
                </Link>
                <Link href="/submit" className="px-2.5 py-1.5 sm:px-3.5 text-sm text-slate-600 font-medium rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-all">
                  <span className="sm:hidden">Submit</span>
                  <span className="hidden sm:inline">Submit claim</span>
                </Link>
                <Link href="/status" className="px-2.5 py-1.5 sm:px-3.5 text-sm text-slate-600 font-medium rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-all">
                  <span className="sm:hidden">Track</span>
                  <span className="hidden sm:inline">Track claim</span>
                </Link>
              </nav>
            </div>
          </header>

          <main className="pt-14">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
