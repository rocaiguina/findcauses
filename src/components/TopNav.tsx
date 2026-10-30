"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const icon = "h-6 w-6";

const ITEMS = [
  {
    href: "/",
    label: "Home",
    match: (p: string) => p === "/",
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
        <path d="M23 9v2h-2v7a3 3 0 0 1-3 3h-4v-6h-4v6H6a3 3 0 0 1-3-3v-7H1V9l11-7 5 3.18V2h3v5.09z" />
      </svg>
    ),
  },
  {
    href: "/organizations",
    label: "Directory",
    match: (p: string) => p.startsWith("/organizations") || p.startsWith("/listings"),
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
        <path d="M4 2h11v20H4zm2 3v2h2V5zm0 4v2h2V9zm0 4v2h2v-2zm4-8v2h2V5zm0 4v2h2V9zm0 4v2h2v-2zm7-5h3v14h-3z" />
      </svg>
    ),
  },
  {
    href: "/find",
    label: "Opportunities",
    match: (p: string) => p.startsWith("/find") || p.startsWith("/opportunities"),
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
        <path d="M17 6V5a3 3 0 0 0-3-3h-4a3 3 0 0 0-3 3v1H2v4a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V6zM9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9zm10 9a5 5 0 0 0 1.81-.35V19a3 3 0 0 1-3 3H6.2a3 3 0 0 1-3-3v-5.35A5 5 0 0 0 5 14z" />
      </svg>
    ),
  },
  {
    href: "/causes",
    hideOnMobile: true,
    label: "Causes",
    match: (p: string) => p.startsWith("/causes"),
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
        <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />
      </svg>
    ),
  },
  {
    href: "/apply",
    label: "Get listed",
    match: (p: string) => p.startsWith("/apply"),
    svg: (
      <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden>
        <path d="M21 13h-8v8h-2v-8H3v-2h8V3h2v8h8z" />
      </svg>
    ),
  },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card">
      <div className="container-page flex h-[52px] items-center gap-3">
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight text-brand" aria-label="JustCause home">
          Just<span className="text-ink">Cause</span>
        </Link>
        <form
          role="search"
          className="relative hidden min-w-0 flex-1 sm:block sm:max-w-[280px]"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/organizations${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
          }}
        >
          <svg viewBox="0 0 16 16" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="currentColor" aria-hidden>
            <path d="M14.56 12.44 11.3 9.18a5.51 5.51 0 1 0-2.12 2.12l3.26 3.26a1.5 1.5 0 1 0 2.12-2.12zM3 6.5A3.5 3.5 0 1 1 6.5 10 3.5 3.5 0 0 1 3 6.5z" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search nonprofits"
            aria-label="Search nonprofits"
            className="h-[34px] w-full rounded bg-[#edf3f8] pl-8 pr-2 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/80"
          />
        </form>
        <nav className="ml-auto flex h-full items-stretch">
          {ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative w-12 flex-col items-center justify-center text-xs sm:w-[72px] ${
                  "hideOnMobile" in item && item.hideOnMobile ? "hidden sm:flex" : "flex"
                } ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {item.svg}
                <span className="hidden sm:block">{item.label}</span>
                {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
