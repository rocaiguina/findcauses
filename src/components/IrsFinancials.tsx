import { StatusPill } from "./OrgCard";
import { moneyFull } from "@/lib/format";
import type { IrsFiling } from "@/lib/types";

/** Year-by-year Form 990 figures from IRS data, or the "not available yet" state. */
export function IrsFinancials({
  filings,
  ein,
  irsName,
  matchScore,
}: {
  filings: IrsFiling[];
  ein: string | null;
  irsName: string | null;
  matchScore: number | null;
}) {
  if (!filings.length || !ein)
    return (
      <div className="rounded-lg border border-dashed border-accent/60 bg-accent/5 p-4">
        <StatusPill>990 not available yet</StatusPill>
        <p className="mt-2 text-sm">
          We haven&apos;t found Form 990 figures for this organization in IRS data. It may file under a different legal
          name, file the short 990-N postcard, or not be a 501(c)(3). Budget, revenue and assets will appear here once
          the organization claims its listing and uploads its 990.
        </p>
      </div>
    );

  const chartRows = filings
    .filter((f) => f.totalRevenue != null || f.totalExpenses != null)
    .slice(0, 8)
    .reverse();
  const chartMax = Math.max(1, ...chartRows.flatMap((f) => [f.totalRevenue ?? 0, f.totalExpenses ?? 0]));

  return (
    <>
      <p className="text-sm text-muted">
        Matched to the IRS record &ldquo;{irsName}&rdquo; ({matchScore}% name match). Figures from{" "}
        <a
          className="font-medium text-link"
          href={`https://projects.propublica.org/nonprofits/organizations/${ein}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          ProPublica Nonprofit Explorer
        </a>
        . Confirm the match before relying on it.
      </p>
      {chartRows.length > 1 && (
        <div className="mt-4 rounded-lg border border-line p-4">
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" /> Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8fb0d6]" /> Expenses
            </span>
          </div>
          <div className="mt-3 flex h-36 items-end gap-3">
            {chartRows.map((f) => (
              <div key={f.taxYear} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-28 w-full items-end justify-center gap-1">
                  <span
                    className="w-1/3 rounded-t bg-brand"
                    style={{ height: `${((f.totalRevenue ?? 0) / chartMax) * 100}%` }}
                    title={`Revenue ${moneyFull(f.totalRevenue ?? 0)}`}
                  />
                  <span
                    className="w-1/3 rounded-t bg-[#8fb0d6]"
                    style={{ height: `${((f.totalExpenses ?? 0) / chartMax) * 100}%` }}
                    title={`Expenses ${moneyFull(f.totalExpenses ?? 0)}`}
                  />
                </div>
                <span className="text-xs text-muted">{f.taxYear}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-right text-sm tabular-nums">
          <thead className="border-b border-line bg-paper/60 text-xs text-muted">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Tax year</th>
              <th className="px-3 py-2 font-semibold">Revenue</th>
              <th className="px-3 py-2 font-semibold">Expenses</th>
              <th className="px-3 py-2 font-semibold">Contributions</th>
              <th className="px-3 py-2 font-semibold">Total assets</th>
              <th className="px-3 py-2 font-semibold">Net assets</th>
            </tr>
          </thead>
          <tbody>
            {filings.map((f) => (
              <tr key={f.taxYear} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-left">
                  {f.taxYear} <span className="text-xs text-muted">{f.formType}</span>
                </td>
                {[f.totalRevenue, f.totalExpenses, f.contributions, f.totalAssets, f.netAssets].map((v, i) => (
                  <td key={i} className="px-3 py-2">
                    {v == null ? "—" : moneyFull(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
