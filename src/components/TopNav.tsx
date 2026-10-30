"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { CAUSES } from "@/lib/causes";
import { useSaved } from "@/lib/saved";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
    </svg>
  );
}

function SavedCount({ n }: { n: number }) {
  if (!n) return null;
  return <span className="rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-[18px] text-white">{n}</span>;
}

/** The dark "Directory" panel, shown under the header on desktop and inside the phone menu. */
function MegaMenu({ onNavigate }: { onNavigate: () => void }) {
  const link = "block py-1 text-[15px] text-white/80 hover:text-white";
  return (
    <div className="bg-navy text-white">
      <div className="container-page grid gap-8 py-8 md:grid-cols-[1.1fr_2fr_1fr_1fr] md:gap-0 md:divide-x md:divide-white/10">
        <div className="md:pr-8">
          <p className="text-xl">Directory</p>
          <p className="mt-1 text-[15px] text-white/60">Mid-size Puerto Rico nonprofits, with IRS Form 990 figures.</p>
          <Link
            href="/organizations"
            onClick={onNavigate}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm hover:bg-white/15"
          >
            Browse all organizations ↗
          </Link>
        </div>
        <div className="md:px-8">
          <p className="text-[15px]">Causes</p>
          <p className="text-sm text-white/60">Twelve areas of work.</p>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Browse by cause</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-6">
            {CAUSES.map((c) => (
              <li key={c.slug}>
                <Link href={`/causes/${c.slug}`} onClick={onNavigate} className={link}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:px-8">
          <p className="text-[15px]">For funders</p>
          <p className="text-sm text-white/60">Find, save and share.</p>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Start here</p>
          <ul className="mt-2">
            <li>
              <Link href="/find" onClick={onNavigate} className={link}>
                Find matches
              </Link>
            </li>
            <li>
              <Link href="/opportunities" onClick={onNavigate} className={link}>
                Impact opportunities
              </Link>
            </li>
            <li>
              <Link href="/shortlist" onClick={onNavigate} className={link}>
                Your shortlist
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:pl-8">
          <p className="text-[15px]">For nonprofits</p>
          <p className="text-sm text-white/60">Reach funders.</p>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Get listed</p>
          <ul className="mt-2">
            <li>
              <Link href="/apply" onClick={onNavigate} className={link}>
                List your nonprofit
              </Link>
            </li>
            <li>
              <Link href="/apply" onClick={onNavigate} className={link}>
                Post impact opportunities
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <Link href="/find" onClick={onNavigate} className="container-page group flex items-center gap-3 py-6">
          <span className="text-xl">Not sure where to start?</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20" aria-hidden>
            →
          </span>
          <span className="hidden text-[15px] text-white/60 sm:inline">Answer 4 quick questions and get your best matches.</span>
        </Link>
      </div>
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const saved = useSaved().keys.length;
  const [open, setOpen] = useState<"directory" | "mobile" | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Close on navigation, Escape, or a click outside the header.
  useEffect(() => setOpen(null), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const item = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[15px] transition-colors ${
      active ? "text-ink" : "text-ink/75 hover:text-ink"
    }`;

  return (
    <header ref={headerRef} className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0 text-ink" aria-label="JustCause home">
          <Logo />
        </Link>

        <nav className="mx-auto hidden items-center gap-1 md:flex" aria-label="Main">
          <Link href="/opportunities" className={item(pathname.startsWith("/opportunities"))}>
            Opportunities
          </Link>
          <button
            type="button"
            aria-expanded={open === "directory"}
            onClick={() => setOpen(open === "directory" ? null : "directory")}
            className={`${item(open === "directory" || pathname.startsWith("/organizations") || pathname.startsWith("/causes"))} ${
              open === "directory" ? "bg-black/[0.05]" : ""
            }`}
          >
            Directory <Chevron open={open === "directory"} />
          </button>
          <Link href="/shortlist" className={item(pathname.startsWith("/shortlist"))}>
            Shortlist <SavedCount n={saved} />
          </Link>
        </nav>

        <div className="ml-auto hidden items-center gap-5 md:flex">
          <Link href="/apply" className="text-[15px] text-ink/75 hover:text-ink">
            List your nonprofit
          </Link>
          <Link href="/find" className="btn-primary !px-5">
            Find matches
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Link href="/shortlist" className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-ink/80">
            ★ <SavedCount n={saved} />
          </Link>
          <button
            type="button"
            aria-expanded={open === "mobile"}
            aria-label="Menu"
            onClick={() => setOpen(open === "mobile" ? null : "mobile")}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              {open === "mobile" ? <path d="m5 5 10 10M15 5 5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </div>
      </div>

      {open === "directory" && (
        <div className="absolute inset-x-0 top-full hidden shadow-2xl md:block">
          <MegaMenu onNavigate={() => setOpen(null)} />
        </div>
      )}
      {open === "mobile" && (
        <div className="absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl md:hidden">
          <div className="bg-navy px-4 pt-4">
            <Link href="/find" onClick={() => setOpen(null)} className="btn-primary w-full">
              Find matches
            </Link>
          </div>
          <MegaMenu onNavigate={() => setOpen(null)} />
        </div>
      )}
    </header>
  );
}
