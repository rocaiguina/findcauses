import { getCause } from "./causes";
import { money, placeName, yearsSince } from "./format";
import { fundingTypeLabel, type FundingType } from "./funding";
import type { DirectoryEntry, FundingNeed } from "./types";

// Matches a funder's preferences against impact opportunities and explains why,
// the way a job site shows "how you match" for each posting.

export type FunderPrefs = {
  causes: string[];
  states: string[];
  fundingTypes: FundingType[];
  orgBudgetMin: number | null;
  orgBudgetMax: number | null;
  giftMin: number | null;
  giftMax: number | null;
  requires990: boolean;
  requiresAudit: boolean;
  minIrsYears: number | null;
};

export type ReasonStatus = "match" | "partial" | "miss" | "unknown";
export type Reason = { key: string; status: ReasonStatus; text: string; mustHave?: boolean };

/** Shown on opportunities JustCause added to a real organization's listing. */
export const ADDED_BY_JUSTCAUSE = "Example opportunity added by JustCause, not posted by the organization. Confirm with them.";

/** True for fictional example organizations and for example opportunities added to real listings. */
export const isExample = (opp: Opportunity) => Boolean(opp.entry.example || opp.need?.example);

/** A funding need, or the general support implied for listings that haven't posted any. */
export type Opportunity = {
  key: string;
  entry: DirectoryEntry;
  need: FundingNeed | null;
  title: string;
  type: FundingType;
  amount: number | null;
  implied: boolean;
};

export type MatchResult = {
  score: number;
  label: "Top match" | "Good match" | "Partial match" | "Low match" | "Missing a must-have";
  reasons: Reason[];
  /** Positive signals that don't depend on preferences, e.g. a verified profile. */
  highlights: string[];
  met: number;
  considered: number;
};

export function opportunitiesFor(entry: DirectoryEntry): Opportunity[] {
  if (entry.needs.length)
    return entry.needs.map((need, i) => ({
      key: `${entry.kind}-${entry.id}-${i}`,
      entry,
      need,
      title: need.title,
      type: need.type,
      amount: need.amount,
      implied: false,
    }));
  return [
    {
      key: `${entry.kind}-${entry.id}-general`,
      entry,
      need: null,
      title: "General operating support",
      type: "general_operating",
      amount: null,
      implied: true,
    },
  ];
}

const range = (min: number | null, max: number | null) =>
  min != null && max != null ? `${money(min)}–${money(max)}` : min != null ? `${money(min)}+` : `up to ${money(max!)}`;

const within = (v: number, min: number | null, max: number | null) => (min == null || v >= min) && (max == null || v <= max);

const WEIGHTS: Record<string, number> = { cause: 30, location: 15, size: 15, gift: 15, type: 15, must: 5 };
const CREDIT: Record<ReasonStatus, number> = { match: 1, partial: 0.5, unknown: 0.25, miss: 0 };

export function matchOpportunity(prefs: FunderPrefs, opp: Opportunity): MatchResult {
  const e = opp.entry;
  const reasons: Reason[] = [];
  const causeLabel = getCause(e.cause)?.label ?? e.cause;

  if (prefs.causes.length)
    reasons.push(
      prefs.causes.includes(e.cause)
        ? { key: "cause", status: "match", text: `Works on ${causeLabel}, one of your causes` }
        : { key: "cause", status: "miss", text: `Works on ${causeLabel}, which isn't one of your causes` },
    );

  if (prefs.states.length)
    reasons.push(
      prefs.states.includes(e.state)
        ? { key: "location", status: "match", text: `Based in ${placeName(e.state)}, where you fund` }
        : { key: "location", status: "miss", text: `Based in ${placeName(e.state)}, outside the places you fund` },
    );

  if (prefs.orgBudgetMin != null || prefs.orgBudgetMax != null) {
    const want = range(prefs.orgBudgetMin, prefs.orgBudgetMax);
    reasons.push(
      e.budget == null
        ? { key: "size", status: "unknown", text: `Budget unknown (no 990 figures yet); you prefer ${want}` }
        : within(e.budget, prefs.orgBudgetMin, prefs.orgBudgetMax)
          ? { key: "size", status: "match", text: `${money(e.budget)} budget fits your ${want} range` }
          : { key: "size", status: "miss", text: `${money(e.budget)} budget is outside your ${want} range` },
    );
  }

  if (prefs.giftMin != null || prefs.giftMax != null) {
    const gifts = range(prefs.giftMin, prefs.giftMax);
    if (opp.amount != null) {
      if (within(opp.amount, prefs.giftMin, prefs.giftMax))
        reasons.push({ key: "gift", status: "match", text: `Seeking ${money(opp.amount)}, within your ${gifts} gifts` });
      else if (prefs.giftMax != null && opp.amount > prefs.giftMax)
        reasons.push({
          key: "gift",
          status: "partial",
          text: `Seeking ${money(opp.amount)}, more than your typical gift; you could fund part of it`,
        });
      else reasons.push({ key: "gift", status: "partial", text: `Seeking ${money(opp.amount)}, less than your typical gift` });
    } else if (e.budget == null) {
      reasons.push({ key: "gift", status: "unknown", text: "No amount posted and no budget to size your gift against" });
    } else {
      // Size a general-support gift against the organization's budget.
      const gift = prefs.giftMin != null && prefs.giftMax != null ? (prefs.giftMin + prefs.giftMax) / 2 : (prefs.giftMax ?? prefs.giftMin)!;
      const share = gift / e.budget;
      const pct = share < 0.01 ? `about ${(share * 100).toFixed(1)}%` : `about ${Math.round(share * 100)}%`;
      reasons.push(
        share > 0.2
          ? { key: "gift", status: "partial", text: `Your typical gift would be ${pct} of their budget, a lot of dependence on one funder` }
          : share < 0.005
            ? { key: "gift", status: "partial", text: `Your typical gift would be ${pct} of their budget, a modest share` }
            : { key: "gift", status: "match", text: `Your typical gift would be ${pct} of their budget, meaningful without creating dependence` },
      );
    }
  }

  if (prefs.fundingTypes.length) {
    const label = fundingTypeLabel(opp.type);
    reasons.push(
      prefs.fundingTypes.includes(opp.type)
        ? { key: "type", status: "match", text: `${label}${opp.implied ? " (assumed)" : ""}, a kind of funding you give` }
        : { key: "type", status: "miss", text: `${label}${opp.implied ? " (assumed)" : ""}, not a kind of funding you give` },
    );
  }

  if (prefs.requires990)
    reasons.push(
      e.budget != null
        ? { key: "990", status: "match", text: "Form 990 financials available", mustHave: true }
        : { key: "990", status: "miss", text: "No Form 990 financials yet", mustHave: true },
    );

  if (prefs.requiresAudit)
    reasons.push(
      e.kind === "imported"
        ? { key: "audit", status: "unknown", text: "Audit status unknown until the organization claims its listing", mustHave: true }
        : e.audited
          ? { key: "audit", status: "match", text: "Financials are independently audited", mustHave: true }
          : { key: "audit", status: "miss", text: "Not independently audited", mustHave: true },
    );

  if (prefs.minIrsYears != null && prefs.minIrsYears > 0) {
    const years = e.irsSince ? yearsSince(e.irsSince) : null;
    reasons.push(
      years == null
        ? { key: "irs", status: "unknown", text: "IRS recognition date unknown", mustHave: true }
        : years >= prefs.minIrsYears
          ? { key: "irs", status: "match", text: `IRS-recognized for ${years} years (you want ${prefs.minIrsYears}+)`, mustHave: true }
          : { key: "irs", status: "miss", text: `IRS-recognized for ${years} years (you want ${prefs.minIrsYears}+)`, mustHave: true },
    );
  }

  const highlights: string[] = [];
  if (e.example) highlights.push("Example organization (fictional), for demonstration");
  else if (opp.need?.example) highlights.push(ADDED_BY_JUSTCAUSE);
  else if (e.kind === "profile") highlights.push("Verified profile, checked against its Form 990");
  if (e.programShare != null && e.programShare >= 0.75)
    highlights.push(`${Math.round(e.programShare * 100)}% of spending goes to programs`);
  if (e.irsSince && yearsSince(e.irsSince) >= 20) highlights.push(`Established: IRS-recognized ${yearsSince(e.irsSince)} years`);

  const weightOf = (r: Reason) => WEIGHTS[r.mustHave ? "must" : r.key] ?? 5;
  const total = reasons.reduce((s, r) => s + weightOf(r), 0);
  const earned = reasons.reduce((s, r) => s + weightOf(r) * CREDIT[r.status], 0);
  const blocked = reasons.some((r) => r.mustHave && r.status === "miss");
  let score = total ? Math.round((earned / total) * 100) : 50;
  if (blocked) score = Math.min(score, 35);
  // Verified, fuller profiles rank ahead of equivalent unclaimed listings, but never paper over a miss.
  if (e.kind === "profile" && !reasons.some((r) => r.status === "miss")) score = Math.min(100, score + 5);

  const label: MatchResult["label"] = blocked
    ? "Missing a must-have"
    : score >= 85
      ? "Top match"
      : score >= 65
        ? "Good match"
        : score >= 45
          ? "Partial match"
          : "Low match";

  return {
    score,
    label,
    reasons,
    highlights,
    met: reasons.filter((r) => r.status === "match").length,
    considered: reasons.length,
  };
}

/** The best-matching opportunity for each organization, for badges on directory rows and profiles. */
export function bestMatchFor(prefs: FunderPrefs, entry: DirectoryEntry) {
  return opportunitiesFor(entry)
    .map((opp) => ({ opp, result: matchOpportunity(prefs, opp) }))
    .sort((a, b) => b.result.score - a.result.score)[0];
}

export function hasPreferences(p: FunderPrefs): boolean {
  return Boolean(
    p.causes.length ||
      p.states.length ||
      p.fundingTypes.length ||
      p.orgBudgetMin != null ||
      p.orgBudgetMax != null ||
      p.giftMin != null ||
      p.giftMax != null ||
      p.requires990 ||
      p.requiresAudit ||
      p.minIrsYears,
  );
}

