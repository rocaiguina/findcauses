import Link from "next/link";
import { money } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import type { MatchResult, Opportunity, Reason } from "@/lib/match";

const BADGE: Record<MatchResult["label"], string> = {
  "Top match": "bg-success text-white",
  "Good match": "bg-success/10 text-success",
  "Partial match": "bg-accent/10 text-accent",
  "Low match": "bg-black/5 text-muted",
  "Missing a must-have": "bg-red-50 text-red-700",
};

export function MatchBadge({ result }: { result: Pick<MatchResult, "label" | "score"> }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[result.label]}`}
      title={`Match score ${result.score}/100`}
    >
      {result.label}
    </span>
  );
}

const ICON: Record<Reason["status"], { mark: string; cls: string; sr: string }> = {
  match: { mark: "✓", cls: "bg-success/10 text-success", sr: "Matches" },
  partial: { mark: "◐", cls: "bg-accent/10 text-accent", sr: "Partly matches" },
  miss: { mark: "✕", cls: "bg-black/5 text-muted", sr: "Doesn't match" },
  unknown: { mark: "?", cls: "bg-black/5 text-muted", sr: "Unknown" },
};

export function ReasonList({ reasons, limit }: { reasons: Reason[]; limit?: number }) {
  // Lead with what matches, then partial, unknown and misses.
  const order: Reason["status"][] = ["match", "partial", "unknown", "miss"];
  const sorted = [...reasons].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return (
    <ul className="space-y-1.5">
      {(limit ? sorted.slice(0, limit) : sorted).map((r) => (
        <li key={r.key} className="flex items-start gap-2 text-sm">
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ICON[r.status].cls}`}
          >
            <span aria-hidden>{ICON[r.status].mark}</span>
            <span className="sr-only">{ICON[r.status].sr}</span>
          </span>
          <span className={r.status === "miss" ? "text-muted" : ""}>
            {r.text}
            {r.mustHave && <span className="ml-1 text-xs text-muted">(must-have)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function opportunityLine(opp: Opportunity) {
  return [
    fundingTypeLabel(opp.type) + (opp.implied ? " (assumed)" : ""),
    opp.amount != null ? `${money(opp.amount)} sought` : "Amount not posted",
    opp.need?.timeframe,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Sidebar card on an organization page: how the viewing funder matches its best opportunity. */
export function HowYouMatch({ opp, result, editHref }: { opp: Opportunity; result: MatchResult; editHref: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">How you match</p>
        <MatchBadge result={result} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {result.met} of {result.considered} of your answers · best opportunity: {opp.title}
      </p>
      <div className="mt-3">
        <ReasonList reasons={result.reasons} />
      </div>
      {result.highlights.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
          {result.highlights.map((h) => (
            <li key={h}>★ {h}</li>
          ))}
        </ul>
      )}
      <Link href={editHref} className="mt-3 inline-block text-sm font-medium text-link">
        Edit your answers
      </Link>
    </div>
  );
}

export function MatchCta() {
  return (
    <div className="card p-4">
      <p className="font-semibold">Looking for impact opportunities?</p>
      <p className="mt-1 text-sm text-muted">
        Answer 4 quick questions and get your best matches, with why. No account needed.
      </p>
      <Link href="/find" className="btn-ghost mt-3 w-full">
        Find impact opportunities
      </Link>
    </div>
  );
}
