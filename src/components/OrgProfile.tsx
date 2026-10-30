import { CauseBadge, ExamplePill, StatusPill } from "./OrgCard";
import {
  PersonRow,
  ProfileSection,
  ProfileShell,
  ProfileTopCard,
  SimilarOrgs,
  TimelineItem,
  type Highlight,
} from "./Profile";
import { money, moneyFull, monthYear, pct, tenure } from "@/lib/format";
import { RULING_DATE_NOTE } from "@/lib/irs";
import type { DirectoryEntry, Organization } from "@/lib/types";

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          ok ? "bg-success/10 text-success" : "bg-red-50 text-red-700"
        }`}
      >
        {ok ? "✓" : "✕"}
      </span>
      {label}
    </li>
  );
}

export function OrgProfile({
  org,
  form990Href,
  similar = [],
  asideTop,
  opportunities,
}: {
  org: Organization;
  form990Href?: string;
  similar?: DirectoryEntry[];
  /** Rendered first in the sidebar, e.g. how the viewing funder matches. */
  asideTop?: React.ReactNode;
  /** The impact opportunities section, rendered after About. */
  opportunities?: React.ReactNode;
}) {
  const f = org.financials;
  const spend = [
    { label: "Programs", value: f.programExpenses, color: "var(--color-brand)" },
    { label: "Management & general", value: f.managementExpenses, color: "#8fb0d6" },
    { label: "Fundraising", value: f.fundraisingExpenses, color: "#c9c3b4" },
  ];
  const otherRevenue = Math.max(0, f.totalRevenue - f.contributions - f.programRevenue);
  const revenue = [
    { label: "Contributions & grants", value: f.contributions, color: "var(--color-brand)" },
    { label: "Program service revenue", value: f.programRevenue, color: "#8fb0d6" },
    { label: "Other revenue", value: otherRevenue, color: "#c9c3b4" },
  ];

  const highlights: Highlight[] = [
    {
      value: org.irsRulingDate ? tenure(org.irsRulingDate) : <StatusPill>Not available yet</StatusPill>,
      label: org.irsRulingDate
        ? `Recognized by the IRS (since ${monthYear(org.irsRulingDate)})`
        : "Recognized by the IRS",
      title: RULING_DATE_NOTE,
    },
    { value: money(f.totalExpenses), label: `Annual budget (FY${f.fiscalYear})` },
    { value: pct(f.programExpenses, f.totalExpenses), label: "Spent on programs" },
    { value: money(f.netAssets), label: "Net assets" },
    { value: `${f.employees} / ${f.volunteers.toLocaleString("en-US")}`, label: "Staff / volunteers" },
  ];

  return (
    <ProfileShell
      aside={
        <>
          {asideTop}
          <div className="card p-4 text-sm">
            <p className="font-semibold">Contact</p>
            <p className="mt-2">
              {org.contact.name}
              <span className="text-muted"> · {org.contact.title}</span>
            </p>
            <a className="mt-1 block font-semibold text-brand hover:underline" href={`mailto:${org.contact.email}`}>
              {org.contact.email}
            </a>
            <p className="text-muted">{org.contact.phone}</p>
          </div>
          <SimilarOrgs entries={similar} />
        </>
      }
    >
      <ProfileTopCard
        name={org.name}
        cause={org.cause}
        headline={org.tagline}
        meta={
          <>
            {org.city}, {org.state} · Founded {org.yearFounded} · {org.geographicScope} · EIN {org.ein}
          </>
        }
        badges={
          <>
            <CauseBadge slug={org.cause} />
            {org.example && <ExamplePill />}
            {org.focusAreas.map((a) => (
              <span key={a} className="chip">
                {a}
              </span>
            ))}
          </>
        }
        actions={
          <>
            <a href={`mailto:${org.contact.email}`} className="btn-primary">
              Message {org.contact.name.split(" ").find((w) => !/^(dr|dra|sr|sra|srta|lcdo|lcda|mr|mrs|ms|prof)\.?$/i.test(w)) ?? "them"}
            </a>
            <a href={org.website} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Website ↗
            </a>
            {form990Href && (
              <a href={form990Href} className="btn-muted">
                Form 990 (FY{f.fiscalYear})
              </a>
            )}
          </>
        }
        highlights={highlights}
        note={org.irsRulingDate ? RULING_DATE_NOTE : undefined}
      />

      <ProfileSection id="about" title="About">
        <p className="text-sm leading-relaxed">{org.mission}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {org.impactMetrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-line p-3">
              <p className="text-xl font-semibold text-brand">{m.value}</p>
              <p className="text-xs text-muted">{m.label}</p>
            </div>
          ))}
        </div>
      </ProfileSection>

      {opportunities}

      <ProfileSection id="track-record" title="Track record">
        <ul>
          {org.trackRecord.map((m) => (
            <TimelineItem key={`${m.year}-${m.title}`} badge={m.year} title={m.title}>
              {m.description}
            </TimelineItem>
          ))}
        </ul>
      </ProfileSection>

      <ProfileSection id="roadmap" title="Roadmap">
        <ul>
          {org.roadmap.map((r) => (
            <TimelineItem key={`${r.timeframe}-${r.goal}`} badge="◎" title={r.goal} subtitle={r.timeframe}>
              {r.description}
            </TimelineItem>
          ))}
        </ul>
      </ProfileSection>

      <ProfileSection id="networks" title="Networks & partners">
        <ul>
          {org.networks.map((n) => (
            <TimelineItem key={n.name} badge="⇄" title={n.name} subtitle={n.type}>
              {n.description}
            </TimelineItem>
          ))}
        </ul>
      </ProfileSection>

      <ProfileSection id="financials" title="Financials" subtitle={`Form 990, fiscal year ${f.fiscalYear}`}>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { title: "Where the money goes", total: f.totalExpenses, rows: spend, totalLabel: "Total expenses" },
            { title: "Where the money comes from", total: f.totalRevenue, rows: revenue, totalLabel: "Total revenue" },
          ].map((chart) => (
            <div key={chart.title} className="rounded-lg border border-line p-4">
              <h3 className="text-sm font-semibold">{chart.title}</h3>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-line">
                {chart.rows.map((r) => (
                  <span
                    key={r.label}
                    style={{ width: `${(r.value / (chart.total || 1)) * 100}%`, backgroundColor: r.color }}
                  />
                ))}
              </div>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {chart.rows.map((r) => (
                    <tr key={r.label} className="border-b border-line last:border-0">
                      <td className="py-1.5">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                        {r.label}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{moneyFull(r.value)}</td>
                      <td className="w-12 py-1.5 text-right text-muted tabular-nums">{pct(r.value, chart.total)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="pt-1.5">{chart.totalLabel}</td>
                    <td className="pt-1.5 text-right tabular-nums">{moneyFull(chart.total)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            ["Total assets", moneyFull(f.totalAssets)],
            ["Net assets", moneyFull(f.netAssets)],
            ["Surplus / deficit", moneyFull(f.totalRevenue - f.totalExpenses)],
            ["Net assets ÷ monthly expenses", ((f.netAssets / (f.totalExpenses || 1)) * 12).toFixed(1)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-line p-3">
              <dt className="text-xs text-muted">{l}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </ProfileSection>

      <ProfileSection id="board" title="Board of directors" subtitle={`${org.board.length} members`}>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {org.board.map((m) => (
            <PersonRow key={m.name} name={m.name} line={`${m.role} · ${m.affiliation}`} />
          ))}
        </ul>
      </ProfileSection>

      <ProfileSection id="stewardship" title="Stewardship & accountability">
        <ul className="space-y-2">
          <Check
            ok={org.stewardship.independentAudit}
            label={
              org.stewardship.independentAudit
                ? `Independent audit · ${org.stewardship.auditor}`
                : `No independent audit · ${org.stewardship.auditor}`
            }
          />
          <Check ok={org.stewardship.conflictOfInterestPolicy} label="Conflict of interest policy" />
          <Check ok={org.stewardship.whistleblowerPolicy} label="Whistleblower policy" />
          <Check ok={org.stewardship.documentRetentionPolicy} label="Document retention policy" />
        </ul>
        <dl className="mt-4 space-y-3 text-sm">
          {[
            ["Reporting to funders", org.stewardship.funderReporting],
            ["How impact is measured", org.stewardship.impactMeasurement],
            ["Restricted gifts", org.stewardship.restrictedFunds],
          ].map(([l, v]) => (
            <div key={l}>
              <dt className="font-semibold">{l}</dt>
              <dd className="text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </ProfileSection>
    </ProfileShell>
  );
}
