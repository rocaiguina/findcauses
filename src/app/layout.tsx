import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "JustCause — Mid-size nonprofits, funder-ready", template: "%s · JustCause" },
  description:
    "A directory of mid-size U.S. nonprofits with mission, track record, networks, roadmap, Form 990 financials, board and stewardship in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <header className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-20">
          <div className="container-page flex h-16 items-center justify-between gap-4">
            <Link href="/" className="font-serif text-2xl font-semibold tracking-tight text-brand">
              Just<span className="text-accent">Cause</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm sm:gap-4">
              <Link href="/organizations" className="rounded-full px-3 py-2 hover:text-brand">
                Directory
              </Link>
              <Link href="/causes" className="hidden rounded-full px-3 py-2 hover:text-brand sm:inline">
                Causes
              </Link>
              <Link href="/apply" className="btn-primary whitespace-nowrap !px-4 !py-2">
                <span className="sm:hidden">Get listed</span>
                <span className="hidden sm:inline">List your nonprofit</span>
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-20 border-t border-line">
          <div className="container-page flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:justify-between">
            <p>
              <span className="font-serif font-semibold text-brand">JustCause</span> — helping funders find
              mid-size nonprofits doing serious work.
            </p>
            <p>Financial data is self-reported from each organization&apos;s IRS Form 990.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
