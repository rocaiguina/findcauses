import { isAnswered, parseCriteria } from "@/lib/criteria";
import { fundingTypeLabel } from "@/lib/funding";
import { linkedinCompanySearch, linkedinPeopleSearch } from "@/lib/linkedin";
import { buildShortlist, SHORTLIST_SIZE } from "@/lib/shortlist";
import { listDirectory } from "@/lib/store";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralize spreadsheet formulas and quote every cell.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** The shortlist as a CSV, for pasting into an internal memo or tracker. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const criteria = parseCriteria(url.searchParams);
  if (!isAnswered(criteria)) return new Response("Answer the questions first", { status: 400 });
  const size = url.searchParams.get("more") === "1" ? SHORTLIST_SIZE * 2 : SHORTLIST_SIZE;
  const { items } = buildShortlist(await listDirectory(), criteria, size);

  const header = [
    "Rank", "Impact opportunity", "Organization", "Example", "Location", "Funding type", "Amount sought", "Timeframe",
    "Match", "Why it fits", "Organization budget", "Budget year", "IRS-recognized since", "Profile",
    "LinkedIn: organization", "LinkedIn: people",
  ];
  const rows = items.map(({ opp, result }, i) => [
    i + 1,
    opp.title + (opp.implied ? " (no opportunity posted)" : ""),
    opp.entry.name,
    opp.entry.example ? "yes" : opp.need?.example ? "added by JustCause" : "",
    [opp.entry.city, opp.entry.state].filter(Boolean).join(", "),
    fundingTypeLabel(opp.type),
    opp.amount ?? "",
    opp.need?.timeframe ?? "",
    result.label,
    result.reasons.filter((r) => r.status === "match").map((r) => r.text).join("; "),
    opp.entry.budget ?? "",
    opp.entry.budgetYear ?? "",
    opp.entry.irsSince ?? "",
    new URL(opp.entry.href, url.origin).toString(),
    linkedinCompanySearch(opp.entry.name),
    linkedinPeopleSearch(opp.entry.name),
  ]);
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="justcause-shortlist.csv"',
    },
  });
}
