import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Logo } from "@/components/Logo";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "FindCauses — Mid-size nonprofits, funder-ready", template: "%s · FindCauses" },
  description:
    "A directory of mid-size U.S. nonprofits with mission, track record, networks, roadmap, Form 990 financials, board and stewardship in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <TopNav />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-line">
          <div className="container-page flex flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="text-ink" aria-label="FindCauses home">
              <Logo />
            </Link>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/opportunities" className="hover:text-ink">
                Opportunities
              </Link>
              <Link href="/organizations" className="hover:text-ink">
                Directory
              </Link>
              <Link href="/causes" className="hover:text-ink">
                Causes
              </Link>
              <Link href="/apply" className="hover:text-ink">
                List your nonprofit
              </Link>
            </nav>
            <p className="text-xs">© {new Date().getFullYear()} · Financial data from IRS Form 990 filings</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
