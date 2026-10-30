"use client";

import { useMemo, useState } from "react";
import { OrgCard } from "./OrgCard";
import { CAUSES } from "@/lib/causes";
import { BUDGET_BANDS } from "@/lib/config";
import type { Organization } from "@/lib/types";

type Sort = "name" | "budget-desc" | "budget-asc" | "program-share" | "founded";

export function DirectoryBrowser({ orgs, initialCause = "" }: { orgs: Organization[]; initialCause?: string }) {
  const [query, setQuery] = useState("");
  const [cause, setCause] = useState(initialCause);
  const [band, setBand] = useState("");
  const [state, setState] = useState("");
  const [auditedOnly, setAuditedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("name");

  const states = useMemo(() => [...new Set(orgs.map((o) => o.state))].sort(), [orgs]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const b = BUDGET_BANDS.find((x) => x.id === band);
    const filtered = orgs.filter((o) => {
      if (cause && o.cause !== cause) return false;
      if (state && o.state !== state) return false;
      if (auditedOnly && !o.stewardship.independentAudit) return false;
      if (b && (o.financials.totalExpenses < b.min || o.financials.totalExpenses >= b.max)) return false;
      if (!q) return true;
      return [o.name, o.tagline, o.mission, o.city, ...o.focusAreas, ...o.networks.map((n) => n.name)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const programShare = (o: Organization) => o.financials.programExpenses / (o.financials.totalExpenses || 1);
    return filtered.sort((a, b) => {
      switch (sort) {
        case "budget-desc":
          return b.financials.totalExpenses - a.financials.totalExpenses;
        case "budget-asc":
          return a.financials.totalExpenses - b.financials.totalExpenses;
        case "program-share":
          return programShare(b) - programShare(a);
        case "founded":
          return a.yearFounded - b.yearFounded;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [orgs, query, cause, band, state, auditedOnly, sort]);

  const reset = () => {
    setQuery("");
    setCause("");
    setBand("");
    setState("");
    setAuditedOnly(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <div>
          <label htmlFor="q" className="field-label">
            Search
          </label>
          <input
            id="q"
            className="field"
            placeholder="Name, issue, city, partner…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <fieldset>
          <legend className="field-label">Cause</legend>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {[{ slug: "", label: "All causes", color: "#16201c" }, ...CAUSES].map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCause(c.slug)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                  cause === c.slug ? "bg-brand-soft font-semibold text-brand" : "hover:bg-card"
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div>
            <label htmlFor="band" className="field-label">
              Annual budget (990)
            </label>
            <select id="band" className="field" value={band} onChange={(e) => setBand(e.target.value)}>
              <option value="">Any size</option>
              {BUDGET_BANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="state" className="field-label">
              State
            </label>
            <select id="state" className="field" value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={auditedOnly} onChange={(e) => setAuditedOnly(e.target.checked)} />
          Independently audited only
        </label>
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{results.length}</span>{" "}
            {results.length === 1 ? "organization" : "organizations"}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Sort</span>
            <select className="field !w-auto !py-1.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="name">Name (A–Z)</option>
              <option value="budget-desc">Budget (largest)</option>
              <option value="budget-asc">Budget (smallest)</option>
              <option value="program-share">Share to programs</option>
              <option value="founded">Oldest first</option>
            </select>
          </label>
        </div>
        {results.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((o) => (
              <OrgCard key={o.id} org={o} />
            ))}
          </div>
        ) : (
          <div className="card p-10 text-center">
            <p className="font-serif text-xl">No organizations match those filters.</p>
            <button type="button" onClick={reset} className="btn-ghost mt-4">
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
