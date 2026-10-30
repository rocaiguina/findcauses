"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { OrgRow } from "./OrgCard";
import { CAUSES } from "@/lib/causes";
import { BUDGET_BANDS } from "@/lib/config";
import { searchWords } from "@/lib/format";
import type { DirectoryEntry } from "@/lib/types";

type Sort = "budget-desc" | "budget-asc" | "name" | "program-share" | "irs-tenure";
type Kind = "" | "profile" | "imported";

const PAGE = 30;

export function DirectoryBrowser({
  entries,
  initialCause = "",
  initialQuery = "",
}: {
  entries: DirectoryEntry[];
  initialCause?: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [cause, setCause] = useState(initialCause);
  const [band, setBand] = useState("");
  const [state, setState] = useState("");
  const [kind, setKind] = useState<Kind>("");
  const [withFinancials, setWithFinancials] = useState(false);
  const [auditedOnly, setAuditedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("budget-desc");
  const [shown, setShown] = useState(PAGE);

  const states = useMemo(() => [...new Set(entries.map((o) => o.state))].sort(), [entries]);
  const causeCounts = useMemo(() => {
    const counts: Record<string, number> = { "": entries.length };
    for (const e of entries) counts[e.cause] = (counts[e.cause] ?? 0) + 1;
    return counts;
  }, [entries]);

  const results = useMemo(() => {
    // Every query word must appear somewhere in the entry, in any order, ignoring accents.
    const words = searchWords(query);
    const b = BUDGET_BANDS.find((x) => x.id === band);
    const filtered = entries.filter((o) => {
      if (cause && o.cause !== cause) return false;
      if (state && o.state !== state) return false;
      if (kind && o.kind !== kind) return false;
      if (withFinancials && o.budget == null) return false;
      if (auditedOnly && !o.audited) return false;
      if (b && (o.budget == null || o.budget < b.min || o.budget >= b.max)) return false;
      return words.every((w) => o.searchText.includes(w));
    });
    // Unknown values always sort last, whatever the direction.
    const by = (v: number | undefined, dir: 1 | -1) => (v == null ? Infinity : dir * v);
    return filtered.sort((a, b) => {
      switch (sort) {
        case "budget-desc":
          return by(a.budget, -1) - by(b.budget, -1) || a.name.localeCompare(b.name);
        case "budget-asc":
          return by(a.budget, 1) - by(b.budget, 1) || a.name.localeCompare(b.name);
        case "program-share":
          return by(a.programShare, -1) - by(b.programShare, -1) || a.name.localeCompare(b.name);
        case "irs-tenure":
          // Oldest ruling date first; ISO dates sort as strings, unknown last.
          return (a.irsSince ?? "9999").localeCompare(b.irsSince ?? "9999") || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [entries, query, cause, band, state, kind, withFinancials, auditedOnly, sort]);

  // Each filter change restarts paging from the top.
  const update =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setShown(PAGE);
    };

  const reset = () => {
    setQuery("");
    setCause("");
    setBand("");
    setState("");
    setKind("");
    setWithFinancials(false);
    setAuditedOnly(false);
    setShown(PAGE);
  };

  const pill = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
      active ? "border-success bg-success text-white" : "border-[#666] bg-card text-muted hover:bg-black/5 hover:text-ink"
    }`;
  const selectPill = (active: boolean) => `${pill(active)} cursor-pointer appearance-none pr-3 outline-none`;

  return (
    <div>
      {/* Filter bar */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <svg viewBox="0 0 16 16" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="currentColor" aria-hidden>
              <path d="M14.56 12.44 11.3 9.18a5.51 5.51 0 1 0-2.12 2.12l3.26 3.26a1.5 1.5 0 1 0 2.12-2.12zM3 6.5A3.5 3.5 0 1 1 6.5 10 3.5 3.5 0 0 1 3 6.5z" />
            </svg>
            <input
              aria-label="Search the directory"
              className="field !rounded-full !pl-8"
              placeholder="Name, issue, city…"
              value={query}
              onChange={(e) => update(setQuery)(e.target.value)}
            />
          </div>
          <select aria-label="Annual budget" className={selectPill(!!band)} value={band} onChange={(e) => update(setBand)(e.target.value)}>
            <option value="">Budget: any</option>
            {BUDGET_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <select aria-label="State" className={selectPill(!!state)} value={state} onChange={(e) => update(setState)(e.target.value)}>
            <option value="">State: all</option>
            {states.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
          <select
            aria-label="Listing type"
            className={selectPill(!!kind)}
            value={kind}
            onChange={(e) => update(setKind)(e.target.value as Kind)}
          >
            <option value="">All listings</option>
            <option value="profile">Full profiles</option>
            <option value="imported">Unclaimed listings</option>
          </select>
          <button type="button" className={pill(withFinancials)} onClick={() => update(setWithFinancials)(!withFinancials)}>
            Has 990 financials
          </button>
          <button type="button" className={pill(auditedOnly)} onClick={() => update(setAuditedOnly)(!auditedOnly)}>
            Audited
          </button>
          {(query || cause || band || state || kind || withFinancials || auditedOnly) && (
            <button type="button" onClick={reset} className="text-sm font-semibold text-muted hover:text-ink hover:underline">
              Reset
            </button>
          )}
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto border-t border-line px-4 pt-3 [scrollbar-width:none]">
          {[{ slug: "", label: "All causes", color: "#666" }, ...CAUSES].map((c) => (
            <button key={c.slug} type="button" onClick={() => update(setCause)(c.slug)} className={pill(cause === c.slug)}>
              {c.slug && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cause === c.slug ? "#fff" : c.color }}
                />
              )}
              {c.label}
              <span className={`text-xs font-normal ${cause === c.slug ? "text-white/80" : ""}`}>
                {causeCounts[c.slug] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="text-sm text-muted">
              About {results.length.toLocaleString("en-US")} {results.length === 1 ? "result" : "results"}
            </p>
            <label className="flex items-center gap-2 text-sm text-muted">
              Sort by
              <select
                className="cursor-pointer bg-transparent font-semibold text-ink outline-none"
                value={sort}
                onChange={(e) => update(setSort)(e.target.value as Sort)}
              >
                <option value="budget-desc">Budget (largest)</option>
                <option value="budget-asc">Budget (smallest)</option>
                <option value="program-share">Share to programs</option>
                <option value="irs-tenure">Longest IRS recognition</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </label>
          </div>
          {results.length ? (
            <>
              <ul className="divide-y divide-line">
                {results.slice(0, shown).map((o) => (
                  <OrgRow key={`${o.kind}-${o.id}`} entry={o} />
                ))}
              </ul>
              {shown < results.length && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="w-full border-t border-line py-3 text-sm font-semibold text-muted hover:bg-black/5 hover:text-ink"
                >
                  Show more results ({(results.length - shown).toLocaleString("en-US")} left)
                </button>
              )}
            </>
          ) : (
            <div className="p-10 text-center">
              <p className="text-lg font-semibold">No organizations match those filters.</p>
              <button type="button" onClick={reset} className="btn-ghost mt-4">
                Clear filters
              </button>
            </div>
          )}
        </section>

        <aside className="hidden space-y-4 lg:block">
          <div className="card p-4 text-sm">
            <p className="font-semibold">About these listings</p>
            <p className="mt-2 text-muted">
              Full profiles are submitted by the nonprofit and verified against its Form 990. Unclaimed listings come
              from public directories, with figures from IRS filings where we could match them.
            </p>
          </div>
          <div className="card p-4 text-sm">
            <p className="font-semibold">Run a nonprofit?</p>
            <p className="mt-2 text-muted">Claim your listing so funders see your track record, board and roadmap.</p>
            <Link href="/apply" className="btn-ghost mt-3 w-full">
              List your nonprofit
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
