import Link from "next/link";
import { Avatar, ExamplePill, OrgCard } from "@/components/OrgCard";
import { CAUSES } from "@/lib/causes";
import { MID_SIZE_MAX_BUDGET, MID_SIZE_MIN_BUDGET } from "@/lib/config";
import { money, placeName } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import { ADDED_BY_JUSTCAUSE, isExample, opportunitiesFor } from "@/lib/match";
import { listDirectory } from "@/lib/store";
import type { DirectoryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

// One-click searches that go straight to a shortlist, so the value shows before any typing.
const QUICK_SEARCHES = [
  { label: "Education · $25K–$100K", query: "c=education&g=25k-100k&sz=mid" },
  { label: "Public health · $100K–$500K", query: "c=public-health&g=100k-500k&sz=mid&m=990" },
  { label: "Disaster readiness · $100K–$500K", query: "c=disaster-relief,housing&g=100k-500k" },
  { label: "Women entrepreneurs & jobs · $100K–$500K", query: "c=economy&g=100k-500k&sz=mid" },
];

function Stats({ entries }: { entries: DirectoryEntry[] }) {
  const withBudget = entries.filter((e) => e.budget != null);
  const midSize = withBudget.filter((e) => e.budget! >= MID_SIZE_MIN_BUDGET && e.budget! <= MID_SIZE_MAX_BUDGET);
  return (
    <div className="card p-4 text-sm">
      <p className="font-semibold">JustCause today</p>
      <dl className="mt-3 space-y-2">
        {[
          [entries.filter((e) => e.needs.length).length.toLocaleString("en-US"), "organizations with posted opportunities"],
          [entries.length.toLocaleString("en-US"), "organizations listed"],
          [withBudget.length.toLocaleString("en-US"), "with Form 990 financials"],
          [midSize.length.toLocaleString("en-US"), "mid-size ($1M–$50M)"],
        ].map(([v, l]) => (
          <div key={l} className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">{l}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function Home() {
  const entries = await listDirectory();
  // Real organizations' opportunities before the fictional examples.
  const projects = entries
    .flatMap(opportunitiesFor)
    .filter((o) => !o.implied)
    .sort((a, b) => Number(Boolean(a.entry.example)) - Number(Boolean(b.entry.example)))
    .slice(0, 6);
  // Mid-size real organizations, those with impact opportunities first.
  const suggested = entries
    .filter((o) => o.kind === "imported" && o.budget != null && o.budget >= MID_SIZE_MIN_BUDGET && o.budget <= MID_SIZE_MAX_BUDGET)
    .sort((a, b) => b.needs.length - a.needs.length || b.budget! - a.budget!)
    .slice(0, 3);

  return (
    <div className="container-page grid gap-4 py-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-2">
        <section className="card overflow-hidden">
          <div className="px-6 py-8 sm:px-8">
            <h1 className="max-w-2xl text-3xl font-light leading-tight text-[#8f5849] sm:text-[40px]">
              Find impact opportunities worth funding in Puerto Rico
            </h1>
            <p className="mt-4 max-w-xl text-muted">
              Answer 5 quick questions. Get a shortlist of 6 impact opportunities that fit what you fund, with the reasons
              and the IRS numbers behind each one. Then reach the people on LinkedIn.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/find" className="btn-primary !px-6 !py-3 !text-base">
                Find impact opportunities
              </Link>
              <span className="text-sm text-muted">About a minute · no account</span>
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold text-muted">Or try a ready-made search</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_SEARCHES.map((q) => (
                  <Link
                    key={q.query}
                    href={`/opportunities?${q.query}`}
                    className="inline-flex rounded-full border border-[#666] px-3 py-1 text-sm font-semibold text-muted hover:bg-black/5 hover:text-ink"
                  >
                    {q.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {projects.length > 0 && (
          <section className="card overflow-hidden">
            <div className="px-4 pt-4">
              <h2 className="section-title">Impact opportunities seeking funding</h2>
              <p className="text-sm text-muted">Posted by nonprofits, like job listings</p>
            </div>
            <ul className="mt-2 divide-y divide-line">
              {projects.map((opp) => (
                <li key={opp.key} className="flex gap-3 px-4 py-3">
                  <Avatar name={opp.entry.name} cause={opp.entry.cause} size={48} />
                  <div className="min-w-0 flex-1">
                    <Link href={opp.entry.href} className="font-semibold text-brand hover:underline">
                      {opp.title}
                    </Link>
                    <p className="text-sm">{opp.entry.name}</p>
                    <p className="text-xs text-muted">
                      {[opp.entry.city, placeName(opp.entry.state)].filter(Boolean).join(", ")} ·{" "}
                      {opp.amount != null ? money(opp.amount) : "Amount not posted"} · {fundingTypeLabel(opp.type)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isExample(opp) ? <ExamplePill title={opp.entry.example ? undefined : ADDED_BY_JUSTCAUSE} /> : null}
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/find"
              className="block border-t border-line py-3 text-center text-sm font-semibold text-muted hover:bg-black/5 hover:text-ink"
            >
              Find the ones that fit you →
            </Link>
          </section>
        )}

        <section className="card px-4 py-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Mid-size nonprofits to know</h2>
              <p className="text-sm text-muted">From public directories, with IRS Form 990 figures</p>
            </div>
            <Link href="/organizations" className="text-sm font-semibold text-muted hover:text-brand hover:underline">
              See all
            </Link>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {suggested.map((o) => (
              <OrgCard key={`${o.kind}-${o.id}`} entry={o} />
            ))}
          </div>
        </section>

        <section className="card px-4 py-4">
          <h2 className="section-title">Browse by cause</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CAUSES.map((c) => (
              <Link
                key={c.slug}
                href={`/causes/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#666] px-3 py-1 text-sm font-semibold text-muted hover:bg-black/5 hover:text-ink"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.label}
                <span className="text-xs font-normal">{entries.filter((e) => e.cause === c.slug).length}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <aside className="space-y-2">
        <Stats entries={entries} />
        <div className="card p-4 text-sm">
          <p className="font-semibold">Run a nonprofit?</p>
          <p className="mt-1 text-muted">
            Post the impact opportunities you&apos;re raising money for. Funders find them through their shortlists.
          </p>
          <Link href="/apply" className="btn-ghost mt-3 w-full">
            Post your opportunities
          </Link>
        </div>
        <div className="card p-4 text-xs text-muted">
          <ExamplePill />
          <p className="mt-2">
            Organizations marked <span className="font-semibold">Example</span> are fictional, added so you can see the
            flow before nonprofits post real opportunities.
          </p>
        </div>
      </aside>
    </div>
  );
}
