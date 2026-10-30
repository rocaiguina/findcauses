import Link from "next/link";
import { HowYouMatch, MatchBadge, MatchCta } from "./Match";
import { ExamplePill, StatusPill } from "./OrgCard";
import { ProfileSection, TimelineItem } from "./Profile";
import { isAnswered, parseCriteria, toPrefs } from "@/lib/criteria";
import { money } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import { ADDED_BY_JUSTCAUSE, bestMatchFor, matchOpportunity, opportunitiesFor, type FunderPrefs } from "@/lib/match";
import type { DirectoryEntry } from "@/lib/types";

/** Finder answers carried over from the shortlist as ?m=<query>, if any. */
export function prefsFrom(m: string | string[] | undefined): { prefs: FunderPrefs; query: string } | null {
  const query = typeof m === "string" ? m : "";
  const criteria = parseCriteria(new URLSearchParams(query));
  return isAnswered(criteria) ? { prefs: toPrefs(criteria), query } : null;
}

/** Sidebar card: how this organization fits the funder's answers, or an invitation to answer them. */
export function MatchAside({ entry, m }: { entry: DirectoryEntry; m?: string | string[] }) {
  const ctx = prefsFrom(m);
  if (!ctx) return <MatchCta />;
  const best = bestMatchFor(ctx.prefs, entry);
  return (
    <div className="space-y-2">
      <Link href={`/opportunities?${ctx.query}`} className="block text-sm font-semibold text-brand hover:underline">
        ← Back to your shortlist
      </Link>
      <HowYouMatch opp={best.opp} result={best.result} editHref={`/find?${ctx.query}`} />
    </div>
  );
}

/** The organization's impact opportunities, like a company's open jobs. */
export function FundingOpportunities({ entry, m }: { entry: DirectoryEntry; m?: string | string[] }) {
  const ctx = prefsFrom(m);
  const opps = opportunitiesFor(entry);
  const implied = opps[0]?.implied;
  return (
    <ProfileSection
      id="opportunities"
      title="Impact opportunities"
      subtitle={implied ? undefined : `${opps.length} open ${opps.length === 1 ? "opportunity" : "opportunities"}`}
    >
      {implied ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <StatusPill>No opportunity posted yet</StatusPill>
          Until the organization claims its listing, we assume it would welcome general operating support.
        </div>
      ) : (
        <ul>
          {opps.map((opp) => {
            const result = ctx ? matchOpportunity(ctx.prefs, opp) : null;
            return (
              <TimelineItem
                key={opp.key}
                badge={opp.amount != null ? money(opp.amount) : "—"}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {opp.title}
                    {result && <MatchBadge result={result} />}
                    {opp.need?.example && !entry.example && <ExamplePill title={ADDED_BY_JUSTCAUSE} />}
                  </span>
                }
                subtitle={[fundingTypeLabel(opp.type), opp.need?.timeframe].filter(Boolean).join(" · ")}
              >
                {opp.need?.description}
                {opp.need?.example && !entry.example && (
                  <span className="mt-1 block text-xs text-muted">{ADDED_BY_JUSTCAUSE}</span>
                )}
              </TimelineItem>
            );
          })}
        </ul>
      )}
    </ProfileSection>
  );
}
