import type { Metadata } from "next";
import Link from "next/link";
import { LoadSaved, RemoveButton, ShortlistActions } from "./ShortlistClient";
import { MatchBadge, ReasonList } from "@/components/Match";
import { Avatar, ExamplePill } from "@/components/OrgCard";
import { approachLabel } from "@/lib/approach";
import { describe, parseCriteria } from "@/lib/criteria";
import { money, placeName, tenure } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import { linkedinCompanySearch, linkedinPeopleSearch } from "@/lib/linkedin";
import { ADDED_BY_JUSTCAUSE, isExample } from "@/lib/match";
import { loadSaved, parseIds } from "@/lib/savedShortlist";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your shortlist", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;

export default async function ShortlistPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ids = parseIds(sp.ids);
  if (!ids.length)
    return (
      <div className="container-page py-8">
        <LoadSaved />
      </div>
    );

  const q = typeof sp.q === "string" ? sp.q : "";
  const items = await loadSaved(ids, q);
  const answers = describe(parseCriteria(new URLSearchParams(q)));
  const csvHref = `/shortlist/export?${new URLSearchParams({ ids: ids.join(","), ...(q ? { q } : {}) })}`;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="container-page max-w-3xl py-6">
      <header className="card px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Your shortlist · {items.length}</h1>
            <p className="text-sm text-muted">
              Puerto Rico nonprofits · {today}
              {answers.length > 0 && <> · {answers.join(", ")}</>}
            </p>
          </div>
          <ShortlistActions ids={ids} csvHref={csvHref} />
        </div>
      </header>

      <ol className="mt-3 space-y-2">
        {items.map(({ opp, result }, i) => {
          const e = opp.entry;
          const key = `${e.kind}-${e.id}`;
          return (
            <li key={key} className="card break-inside-avoid px-5 py-4">
              <div className="flex gap-3">
                <span className="w-4 shrink-0 pt-1 text-sm font-semibold text-muted">{i + 1}</span>
                <Avatar name={e.name} cause={e.cause} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={q ? `${e.href}?m=${encodeURIComponent(q)}` : e.href} className="font-semibold hover:text-brand hover:underline">
                      {e.name}
                    </Link>
                    {result && <MatchBadge result={result} />}
                    {isExample(opp) && <ExamplePill title={e.example ? undefined : ADDED_BY_JUSTCAUSE} />}
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold text-brand">{opp.title}</span>
                    <span className="text-muted">
                      {" "}· {opp.amount != null ? money(opp.amount) : opp.implied ? "No opportunity posted" : "Amount not posted"} ·{" "}
                      {fundingTypeLabel(opp.type)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[e.city, placeName(e.state)].filter(Boolean).join(", ")}
                    {e.budget != null && <> · Budget {money(e.budget)}</>}
                    {e.growth && (
                      <>
                        {" "}· Revenue {e.growth.pct >= 0 ? "+" : ""}
                        {e.growth.pct}% since {e.growth.fromYear}
                      </>
                    )}
                    {e.irsSince && <> · IRS-recognized {tenure(e.irsSince)}</>}
                    {" "}· {e.approaches.map(approachLabel).join(", ")}
                  </p>
                  {result && (
                    <div className="mt-2">
                      <ReasonList reasons={result.reasons} limit={3} />
                    </div>
                  )}
                  <div className="no-print mt-3 flex flex-wrap items-center gap-2">
                    <a href={linkedinCompanySearch(e.name)} target="_blank" rel="noopener noreferrer" className="btn-ghost !min-h-7 !py-0.5">
                      LinkedIn ↗
                    </a>
                    <a href={linkedinPeopleSearch(e.name)} target="_blank" rel="noopener noreferrer" className="btn-muted !min-h-7 !py-0.5">
                      People ↗
                    </a>
                    <span className="flex-1" />
                    <RemoveButton id={key} ids={ids} q={q} />
                  </div>
                  <p className="print-only mt-1 text-xs text-muted">LinkedIn: {linkedinCompanySearch(e.name)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {items.length < ids.length && (
        <p className="mt-3 text-center text-xs text-muted">
          {ids.length - items.length} saved organization{ids.length - items.length === 1 ? " is" : "s are"} no longer listed.
        </p>
      )}
    </div>
  );
}
