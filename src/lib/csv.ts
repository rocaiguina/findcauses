import { approachLabel } from "./approach";
import { fundingTypeLabel } from "./funding";
import { linkedinCompanySearch, linkedinPeopleSearch } from "./linkedin";
import type { MatchResult, Opportunity } from "./match";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralize spreadsheet formulas and quote every cell.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

const HEADER = [
  "Rank", "Organization", "Impact opportunity", "Location", "Approach", "Funding type", "Amount sought",
  "Timeframe", "Match", "Why it fits", "Organization budget", "Budget year", "Revenue growth", "IRS-recognized since",
  "Profile", "LinkedIn: organization", "LinkedIn: people",
];

/** A shortlist as CSV, for pasting into an internal memo or tracker. */
export function shortlistCsv(items: { opp: Opportunity; result?: MatchResult }[], origin: string): Response {
  const rows = items.map(({ opp, result }, i) => {
    const e = opp.entry;
    return [
      i + 1,
      e.name,
      opp.title + (opp.implied ? " (no opportunity posted)" : ""),
      [e.city, e.state].filter(Boolean).join(", "),
      e.approaches.map(approachLabel).join("; "),
      fundingTypeLabel(opp.type),
      opp.amount ?? "",
      opp.need?.timeframe ?? "",
      result?.label ?? "",
      result?.reasons.filter((r) => r.status === "match").map((r) => r.text).join("; ") ?? "",
      e.budget ?? "",
      e.budgetYear ?? "",
      e.growth ? `${e.growth.pct}% (${e.growth.fromYear}–${e.growth.toYear})` : "",
      e.irsSince ?? "",
      new URL(e.href, origin).toString(),
      linkedinCompanySearch(e.name),
      linkedinPeopleSearch(e.name),
    ];
  });
  const csv = [HEADER, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="findcauses-shortlist.csv"',
    },
  });
}
