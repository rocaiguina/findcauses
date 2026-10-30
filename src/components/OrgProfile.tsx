import { CauseBadge } from "./OrgCard";
import { money, moneyFull, pct } from "@/lib/format";
import type { Organization } from "@/lib/types";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8">
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
          ok ? "bg-brand-soft text-brand" : "bg-red-50 text-red-700"
        }`}
      >
        {ok ? "✓" : "✕"}
      </span>
      {label}
    </li>
  );
}

const NAV = [
  ["mission", "Mission"],
  ["track-record", "Track record"],
  ["networks", "Networks"],
  ["roadmap", "Roadmap"],
  ["financials", "Financials"],
  ["board", "Board"],
  ["stewardship", "Stewardship"],
];

export function OrgProfile({ org, form990Href }: { org: Organization; form990Href?: string }) {
  const f = org.financials;
  const spend = [
    { label: "Programs", value: f.programExpenses, color: "var(--color-brand)" },
    { label: "Management & general", value: f.managementExpenses, color: "#8fb3a2" },
    { label: "Fundraising", value: f.fundraisingExpenses, color: "var(--color-accent)" },
  ];
  const otherRevenue = Math.max(0, f.totalRevenue - f.contributions - f.programRevenue);
  const revenue = [
    { label: "Contributions & grants", value: f.contributions, color: "var(--color-brand)" },
    { label: "Program service revenue", value: f.programRevenue, color: "#8fb3a2" },
    { label: "Other revenue", value: otherRevenue, color: "#c9c3b4" },
  ];

  return (
    <article>
      <header className="border-b border-line">
        <div className="container-page py-10">
          <div className="flex flex-wrap items-center gap-2">
            <CauseBadge slug={org.cause} />
            {org.focusAreas.map((a) => (
              <span key={a} className="chip">
                {a}
              </span>
            ))}
            {org.sample && <span className="chip !border-accent !text-accent">Sample profile — fictional data</span>}
          </div>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{org.name}</h1>
          <p className="mt-3 max-w-3xl text-lg text-muted">{org.tagline}</p>
          <p className="mt-4 text-sm text-muted">
            {org.city}, {org.state} · Founded {org.yearFounded} · {org.geographicScope} · EIN {org.ein}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={org.website} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              Website ↗
            </a>
            <a href={`mailto:${org.contact.email}`} className="btn-primary">
              Contact {org.contact.name.split(" ")[0]}
            </a>
            {form990Href && (
              <a href={form990Href} className="btn-ghost">
                Form 990 (FY{f.fiscalYear}) PDF
              </a>
            )}
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              [money(f.totalExpenses), "Annual budget"],
              [pct(f.programExpenses, f.totalExpenses), "Spent on programs"],
              [money(f.netAssets), "Net assets"],
              [`${f.employees} / ${f.volunteers.toLocaleString("en-US")}`, "Staff / volunteers"],
            ].map(([v, l]) => (
              <div key={l} className="border-l-2 border-accent pl-4">
                <dd className="font-serif text-2xl font-semibold sm:text-3xl">{v}</dd>
                <dt className="text-sm text-muted">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[180px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 text-sm">
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded px-2 py-1 text-muted hover:bg-card hover:text-brand">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-10">
          <Section id="mission" title="Mission">
            <p className="max-w-3xl font-serif text-xl leading-relaxed">{org.mission}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {org.impactMetrics.map((m) => (
                <div key={m.label} className="card p-4">
                  <p className="font-serif text-2xl font-semibold text-brand">{m.value}</p>
                  <p className="text-sm text-muted">{m.label}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="track-record" title="Track record">
            <ol className="relative space-y-6 border-l border-line pl-6">
              {org.trackRecord.map((m) => (
                <li key={`${m.year}-${m.title}`} className="relative">
                  <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-paper bg-brand" />
                  <p className="text-sm font-semibold text-accent">{m.year}</p>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="text-sm text-muted">{m.description}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="networks" title="Networks & partners">
            <ul className="grid gap-3 sm:grid-cols-2">
              {org.networks.map((n) => (
                <li key={n.name} className="card p-4">
                  <p className="eyebrow">{n.type}</p>
                  <h3 className="mt-1 font-semibold">{n.name}</h3>
                  <p className="text-sm text-muted">{n.description}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="roadmap" title="Roadmap">
            <ul className="space-y-3">
              {org.roadmap.map((r) => (
                <li key={`${r.timeframe}-${r.goal}`} className="card flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
                  <span className="w-28 shrink-0 font-serif text-lg font-semibold text-brand">{r.timeframe}</span>
                  <div>
                    <h3 className="font-semibold">{r.goal}</h3>
                    <p className="text-sm text-muted">{r.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="financials" title={`Financials · Form 990, fiscal year ${f.fiscalYear}`}>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                { title: "Where the money goes", total: f.totalExpenses, rows: spend, totalLabel: "Total expenses" },
                { title: "Where the money comes from", total: f.totalRevenue, rows: revenue, totalLabel: "Total revenue" },
              ].map((chart) => (
                <div key={chart.title} className="card p-5">
                  <h3 className="font-semibold">{chart.title}</h3>
                  <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-line">
                    {chart.rows.map((r) => (
                      <span
                        key={r.label}
                        style={{ width: `${(r.value / (chart.total || 1)) * 100}%`, backgroundColor: r.color }}
                      />
                    ))}
                  </div>
                  <table className="mt-4 w-full text-sm">
                    <tbody>
                      {chart.rows.map((r) => (
                        <tr key={r.label} className="border-b border-line last:border-0">
                          <td className="py-2">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                            {r.label}
                          </td>
                          <td className="py-2 text-right tabular-nums">{moneyFull(r.value)}</td>
                          <td className="w-14 py-2 text-right text-muted tabular-nums">{pct(r.value, chart.total)}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td className="pt-2">{chart.totalLabel}</td>
                        <td className="pt-2 text-right tabular-nums">{moneyFull(chart.total)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Total assets", moneyFull(f.totalAssets)],
                ["Net assets", moneyFull(f.netAssets)],
                ["Surplus / deficit", moneyFull(f.totalRevenue - f.totalExpenses)],
                ["Net assets ÷ monthly expenses",((f.netAssets / (f.totalExpenses || 1)) * 12).toFixed(1)],
              ].map(([l, v]) => (
                <div key={l} className="card p-3">
                  <dt className="text-xs text-muted">{l}</dt>
                  <dd className="font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="board" title="Board of directors">
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Affiliation</th>
                  </tr>
                </thead>
                <tbody>
                  {org.board.map((m) => (
                    <tr key={m.name} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3">{m.role}</td>
                      <td className="px-4 py-3 text-muted">{m.affiliation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="stewardship" title="Stewardship & accountability">
            <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
              <div className="card p-5">
                <h3 className="font-semibold">Governance</h3>
                <ul className="mt-3 space-y-2">
                  <Check
                    ok={org.stewardship.independentAudit}
                    label={
                      org.stewardship.independentAudit
                        ? `Independent audit · ${org.stewardship.auditor}`
                        : "No independent audit"
                    }
                  />
                  <Check ok={org.stewardship.conflictOfInterestPolicy} label="Conflict of interest policy" />
                  <Check ok={org.stewardship.whistleblowerPolicy} label="Whistleblower policy" />
                  <Check ok={org.stewardship.documentRetentionPolicy} label="Document retention policy" />
                </ul>
              </div>
              <dl className="space-y-4 text-sm">
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
            </div>
            <div className="mt-6 rounded-2xl bg-brand-soft p-5 text-sm">
              <p className="font-semibold text-brand">Talk to the organization</p>
              <p className="mt-1">
                {org.contact.name}, {org.contact.title} ·{" "}
                <a className="underline" href={`mailto:${org.contact.email}`}>
                  {org.contact.email}
                </a>{" "}
                · {org.contact.phone}
              </p>
            </div>
          </Section>
        </div>
      </div>
    </article>
  );
}
