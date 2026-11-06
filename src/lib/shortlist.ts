import { toPrefs, type Criteria } from "./criteria";
import { matchOpportunity, opportunitiesFor, type MatchResult, type Opportunity } from "./match";
import type { DirectoryEntry } from "./types";

// Narrows the whole directory to a handful of impact opportunities a funder can actually follow up on.

export const SHORTLIST_SIZE = 6;

export type ShortlistItem = { opp: Opportunity; result: MatchResult };

export type Shortlist = {
  items: ShortlistItem[];
  /** Organizations in the funder's causes and place, before ranking. */
  considered: number;
  /** How many of those have posted at least one project. */
  posting: number;
  /** Ranked candidates beyond the shortlist, for "show the next 6". */
  remaining: number;
};

// Posted projects are an explicit ask, so they outrank organizations that haven't posted one.
const POSTED_BONUS = 15;

const rankKey = (m: ShortlistItem) =>
  (m.result.label === "Missing a must-have" ? -1000 : 0) + m.result.score + (m.opp.implied ? 0 : POSTED_BONUS);

export function buildShortlist(entries: DirectoryEntry[], criteria: Criteria, size = SHORTLIST_SIZE): Shortlist {
  const prefs = toPrefs(criteria);
  const inScope = entries.filter(
    (e) =>
      (!prefs.causes.length || e.causes.some((c) => prefs.causes.includes(c))) && (!prefs.states.length || prefs.states.includes(e.state)),
  );

  // Best project per organization, so the shortlist is six different organizations.
  const best = inScope.map((entry) =>
    opportunitiesFor(entry)
      .map((opp) => ({ opp, result: matchOpportunity(prefs, opp) }))
      .sort((a, b) => rankKey(b) - rankKey(a))[0],
  );
  best.sort(
    (a, b) =>
      rankKey(b) - rankKey(a) ||
      Number(b.opp.entry.kind === "profile") - Number(a.opp.entry.kind === "profile") ||
      (b.opp.entry.budget ?? 0) - (a.opp.entry.budget ?? 0),
  );

  return {
    items: best.slice(0, size),
    considered: inScope.length,
    posting: inScope.filter((e) => e.needs.length > 0).length,
    remaining: Math.max(0, best.length - size),
  };
}
