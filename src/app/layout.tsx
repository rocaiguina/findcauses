import type { Metadata } from "next";
import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JustCause — Mid-size nonprofits, funder-ready", template: "%s · JustCause" },
  description:
    "A directory of mid-size U.S. nonprofits with mission, track record, networks, roadmap, Form 990 financials, board and stewardship in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <TopNav />
        <main className="flex-1">{children}</main>
        <footer className="mt-12 pb-8">
          <div className="container-page flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              <span className="font-bold text-brand">Just</span>
              <span className="font-bold text-ink">Cause</span> © {new Date().getFullYear()}
            </span>
            <Link href="/organizations" className="hover:text-brand hover:underline">
              Directory
            </Link>
            <Link href="/causes" className="hover:text-brand hover:underline">
              Causes
            </Link>
            <Link href="/apply" className="hover:text-brand hover:underline">
              List your nonprofit
            </Link>
            <span>Financial data from IRS Form 990 filings</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
