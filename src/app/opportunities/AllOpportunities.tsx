"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, ExamplePill } from "@/components/OrgCard";
import { SaveButton } from "@/components/Save";
import { approachLabel, type Approach } from "@/lib/approach";
import { CAUSES } from "@/lib/causes";
import { money, searchWords } from "@/lib/format";
import { fundingTypeLabel, type FundingType } from "@/lib/funding";

/** One posted impact opportunity, flattened for the browse list. */
export type ListedOpportunity = {
  key: string;
  entryKey: string;
  href: string;
  title: string;
  description: string;
  orgName: string;
  place: string;
  cause: string;
  approaches: Approach[];
  type: FundingType;
  amount: number | null;
  timeframe: string | null;
  example: boolean;
  exampleNote?: string;
};

type Sort = "amount-desc" | "amount-asc" | "org";

/** Every posted impact opportunity, with a search box and cause filter. */
export function AllOpportunities({ items }: { items: ListedOpportunity[] }) {
  const [query, setQuery] = useState("");
  const [cause, setCause] = useState("");
  const [sort, setSort] = useState<Sort>("amount-desc");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.cause] = (c[i.cause] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const words = searchWords(query);
    const text = (i: ListedOpportunity) => searchWords(`${i.title} ${i.description} ${i.orgName} ${i.place}`).join(" ");
    return items
      .filter((i) => (!cause || i.cause === cause) && words.every((w) => text(i).includes(w)))
      .sort((a, b) =>
        sort === "org"
          ? a.orgName.localeCompare(b.orgName)
          : // Unknown amounts last in both directions.
            (a.amount == null ? 1 : 0) - (b.amount == null ? 1 : 0) ||
            (sort === "amount-desc" ? (b.amount ?? 0) - (a.amount ?? 0) : (a.amount ?? 0) - (b.amount ?? 0)),
      );
  }, [items, query, cause, sort]);

  const pill = (on: boolean) => (on ? "pill-on" : "pill");

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-normal tracking-[-0.02em] sm:text-[44px]">Impact opportunities</h1>
          <p className="mt-3 max-w-xl text-lg text-muted">What Puerto Rico nonprofits are raising money for right now.</p>
        </div>
        <Link href="/find" className="btn-primary">
          Find my best matches
        </Link>
      </div>

      <div className="relative mt-8">
        <svg viewBox="0 0 16 16" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="currentColor" aria-hidden>
          <path d="M14.56 12.44 11.3 9.18a5.51 5.51 0 1 0-2.12 2.12l3.26 3.26a1.5 1.5 0 1 0 2.12-2.12zM3 6.5A3.5 3.5 0 1 1 6.5 10 3.5 3.5 0 0 1 3 6.5z" />
        </svg>
        <input
          aria-label="Search opportunities"
          placeholder="Search opportunities or organizations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field !rounded-full !py-3 !pl-11 !pr-4 !text-base"
        />
      </div>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button type="button" className={pill(!cause)} onClick={() => setCause("")}>
          All <span className={`text-xs ${!cause ? "text-white/70" : "text-muted"}`}>{items.length}</span>
        </button>
        {CAUSES.filter((c) => counts[c.slug]).map((c) => (
          <button key={c.slug} type="button" className={pill(cause === c.slug)} onClick={() => setCause(c.slug)}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
            {c.label}
            <span className={`text-xs ${cause === c.slug ? "text-white/70" : "text-muted"}`}>{counts[c.slug]}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-end justify-between gap-3 text-sm text-muted">
        <span>
          {shown.length} {shown.length === 1 ? "opportunity" : "opportunities"}
        </span>
        <label className="flex items-center gap-2">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="cursor-pointer bg-transparent text-ink outline-none"
          >
            <option value="amount-desc">Amount (largest)</option>
            <option value="amount-asc">Amount (smallest)</option>
            <option value="org">Organization (A–Z)</option>
          </select>
        </label>
      </div>

      {shown.length ? (
        <ul className="mt-3 border-t border-ink/80">
          {shown.map((i) => (
            <li key={i.key} className="flex items-start gap-4 border-b border-line py-5">
              <Avatar name={i.orgName} cause={i.cause} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={i.href} className="text-[15px] font-medium leading-snug hover:underline underline-offset-4">
                    {i.title}
                  </Link>
                  {i.example && <ExamplePill title={i.exampleNote} />}
                </div>
                <p className="text-sm text-muted">
                  {i.orgName} · {i.place}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm">{i.description}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {fundingTypeLabel(i.type)}
                  {i.timeframe && <> · {i.timeframe}</>} · {i.approaches.map(approachLabel).join(", ")}
                </p>
              </div>
              <div className="hidden w-28 shrink-0 text-right sm:block">
                <p className="text-[15px] tabular-nums">{i.amount != null ? money(i.amount) : "—"}</p>
                <p className="text-xs text-muted">{i.amount != null ? "Sought" : "Amount not posted"}</p>
              </div>
              <SaveButton entryKey={i.entryKey} compact />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-t border-ink/80 py-16 text-center text-muted">No opportunities match that search.</p>
      )}
    </div>
  );
}
