import "server-only";
import { isAnswered, parseCriteria, toPrefs } from "./criteria";
import { bestMatchFor, opportunitiesFor, type MatchResult, type Opportunity } from "./match";
import { listDirectory } from "./store";

export type SavedItem = { opp: Opportunity; result?: MatchResult };

export const MAX_IDS = 25;

/** Parses the "kind-id" keys carried in a /shortlist URL. */
export function parseIds(raw: string | string[] | undefined): string[] {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return [...new Set((s ?? "").split(",").filter((k) => /^(profile|imported)-[0-9a-f-]{36}$/i.test(k)))].slice(0, MAX_IDS);
}

/**
 * The funder's saved organizations, in the order saved, each with its best opportunity. When the finder's
 * answers are present (q), each also gets the match and the reasons.
 */
export async function loadSaved(ids: string[], q: string): Promise<SavedItem[]> {
  const criteria = parseCriteria(new URLSearchParams(q));
  const prefs = isAnswered(criteria) ? toPrefs(criteria) : null;
  const byKey = new Map((await listDirectory()).map((e) => [`${e.kind}-${e.id}`, e]));
  return ids.flatMap((id) => {
    const entry = byKey.get(id);
    if (!entry) return [];
    if (prefs) return [bestMatchFor(prefs, entry)];
    return [{ opp: opportunitiesFor(entry)[0] }];
  });
}
