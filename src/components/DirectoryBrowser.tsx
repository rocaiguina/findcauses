"use client";

import { useMemo, useState } from "react";
import { OrgRow } from "./OrgCard";
import { CAUSES, type CauseSlug } from "@/lib/causes";
import { BUDGET_BANDS } from "@/lib/config";
import { searchWords } from "@/lib/format";
import type { DirectoryEntry } from "@/lib/types";

type Sort = "budget-desc" | "budget-asc" | "name" | "program-share" | "irs-tenure";
type Kind = "" | "certified" | "profile" | "imported";

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
  const [seeking, setSeeking] = useState(false);
  const [auditedOnly, setAuditedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("budget-desc");
  const [shown, setShown] = useState(PAGE);

  const states = useMemo(() => [...new Set(entries.map((o) => o.state))].sort(), [entries]);
  const causeCounts = useMemo(() => {
    const counts: Record<string, number> = { "": entries.length };
    for (const e of entries) for (const c of e.causes) counts[c] = (counts[c] ?? 0) + 1;
    return counts;
  }, [entries]);

  const results = useMemo(() => {
    // Every query word must appear somewhere in the entry, in any order, ignoring accents.
    const words = searchWords(query);
    const b = BUDGET_BANDS.find((x) => x.id === band);
    const filtered = entries.filter((o) => {
      if (cause && !o.causes.includes(cause as CauseSlug)) return false;
      if (state && o.state !== state) return false;
      if (kind === "certified" ? !o.certified : kind && o.kind !== kind) return false;
      if (withFinancials && o.budget == null) return false;
      if (seeking && !o.needs.length) return false;
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
  }, [entries, query, cause, band, state, kind, withFinancials, seeking, auditedOnly, sort]);

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
    setSeeking(false);
    setAuditedOnly(false);
    setShown(PAGE);
  };

  const pill = (active: boolean) => (active ? "pill-on" : "pill");
  const selectPill = (active: boolean) => `${pill(active)} cursor-pointer appearance-none outline-none`;
  const filtered = Boolean(query || cause || band || state || kind || withFinancials || seeking || auditedOnly);

  return (
    <div>
      <div className="relative">
        <svg viewBox="0 0 16 16" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="currentColor" aria-hidden>
          <path d="M14.56 12.44 11.3 9.18a5.51 5.51 0 1 0-2.12 2.12l3.26 3.26a1.5 1.5 0 1 0 2.12-2.12zM3 6.5A3.5 3.5 0 1 1 6.5 10 3.5 3.5 0 0 1 3 6.5z" />
        </svg>
        <input
          aria-label="Search the directory"
          className="field !rounded-full !py-3 !pl-11 !pr-4 !text-base"
          placeholder="Search by name, issue, town or partner"
          value={query}
          onChange={(e) => update(setQuery)(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className={pill(seeking)} onClick={() => update(setSeeking)(!seeking)}>
          Seeking funding
        </button>
        <select aria-label="Annual budget" className={selectPill(!!band)} value={band} onChange={(e) => update(setBand)(e.target.value)}>
          <option value="">Any budget</option>
          {BUDGET_BANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <select aria-label="State" className={selectPill(!!state)} value={state} onChange={(e) => update(setState)(e.target.value)}>
          <option value="">Anywhere</option>
          {states.map((st) => (
            <option key={st}>{st}</option>
          ))}
        </select>
        <select aria-label="Listing type" className={selectPill(!!kind)} value={kind} onChange={(e) => update(setKind)(e.target.value as Kind)}>
          <option value="">All organizations</option>
          <option value="certified">Certified</option>
          <option value="profile">Full profiles</option>
          <option value="imported">IRS data only</option>
        </select>
        <button type="button" className={pill(withFinancials)} onClick={() => update(setWithFinancials)(!withFinancials)}>
          Has 990
        </button>
        <button type="button" className={pill(auditedOnly)} onClick={() => update(setAuditedOnly)(!auditedOnly)}>
          Audited
        </button>
        {filtered && (
          <button type="button" onClick={reset} className="text-link ml-1 text-sm text-muted">
            Clear
          </button>
        )}
      </div>

      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {[{ slug: "", label: "All causes", color: "" }, ...CAUSES.filter((c) => causeCounts[c.slug])].map((c) => (
          <button key={c.slug} type="button" onClick={() => update(setCause)(c.slug)} className={pill(cause === c.slug)}>
            {c.color && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />}
            {c.label}
            <span className={`text-xs ${cause === c.slug ? "text-white/70" : "text-muted"}`}>{causeCounts[c.slug] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted">
          {results.length.toLocaleString("en-US")} {results.length === 1 ? "organization" : "organizations"}
        </p>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort by
          <select
            className="cursor-pointer bg-transparent text-ink outline-none"
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
          <ul className="mt-3 border-t border-ink/80">
            {results.slice(0, shown).map((o) => (
              <OrgRow key={`${o.kind}-${o.id}`} entry={o} />
            ))}
          </ul>
          {shown < results.length && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="btn-ghost">
                Show more ({(results.length - shown).toLocaleString("en-US")} left)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 border-t border-ink/80 py-16 text-center">
          <p className="text-lg">No organizations match those filters.</p>
          <button type="button" onClick={reset} className="text-link mt-3 text-sm">
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
