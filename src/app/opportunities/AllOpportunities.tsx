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

  const pill = (on: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
      on ? "border-success bg-success text-white" : "border-[#666] bg-card text-muted hover:bg-black/5 hover:text-ink"
    }`;

  return (
    <div className="space-y-3">
      <section className="card px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Impact opportunities</h1>
            <p className="text-sm text-muted">What Puerto Rico nonprofits are raising money for right now.</p>
          </div>
          <Link href="/find" className="btn-primary">
            Find my best matches
          </Link>
        </div>
        <input
          aria-label="Search opportunities"
          placeholder="Search opportunities or organizations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field mt-4 !rounded-full !px-4"
        />
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          <button type="button" className={pill(!cause)} onClick={() => setCause("")}>
            All <span className="text-xs font-normal">{items.length}</span>
          </button>
          {CAUSES.filter((c) => counts[c.slug]).map((c) => (
            <button key={c.slug} type="button" className={pill(cause === c.slug)} onClick={() => setCause(c.slug)}>
              {c.label} <span className="text-xs font-normal">{counts[c.slug]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 text-sm text-muted">
          <span>
            {shown.length} {shown.length === 1 ? "opportunity" : "opportunities"}
          </span>
          <label className="flex items-center gap-2">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="cursor-pointer bg-transparent font-semibold text-ink outline-none"
            >
              <option value="amount-desc">Amount (largest)</option>
              <option value="amount-asc">Amount (smallest)</option>
              <option value="org">Organization (A–Z)</option>
            </select>
          </label>
        </div>
        {shown.length ? (
          <ul className="divide-y divide-line">
            {shown.map((i) => (
              <li key={i.key} className="flex gap-3 px-5 py-4">
                <Avatar name={i.orgName} cause={i.cause} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={i.href} className="font-semibold text-brand hover:underline">
                      {i.title}
                    </Link>
                    {i.example && <ExamplePill title={i.exampleNote} />}
                  </div>
                  <p className="text-sm">{i.orgName}</p>
                  <p className="text-xs text-muted">
                    {i.place} · {i.amount != null ? money(i.amount) : "Amount not posted"} · {fundingTypeLabel(i.type)}
                    {i.timeframe && <> · {i.timeframe}</>} · {i.approaches.map(approachLabel).join(", ")}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{i.description}</p>
                </div>
                <SaveButton entryKey={i.entryKey} compact />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted">No opportunities match that search.</p>
        )}
      </section>
    </div>
  );
}
