import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PredictQ Dashboard",
    template: "%s | PredictQ",
  },
  description: "Prediction market intelligence dashboard for live Polymarket monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="relative flex min-h-screen flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(11,90,89,0.2),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(201,109,56,0.18),_transparent_38%)]" />
          <header className="border-b border-white/50 bg-white/55 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <Link
                  href="/"
                  className="font-mono text-xs font-semibold uppercase tracking-[0.32em] text-slate-500"
                >
                  PredictQ
                </Link>
                <p className="mt-1 text-sm text-slate-600">
                  Market intelligence dashboard for live Polymarket signals.
                </p>
              </div>
              <div className="hidden rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 sm:block">
                Searchable market scan with live polling
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
