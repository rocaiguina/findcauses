import Link from "next/link";
import { OrgCard } from "@/components/OrgCard";
import { CAUSES } from "@/lib/causes";
import { money } from "@/lib/format";
import { listApproved } from "@/lib/store";

export const dynamic = "force-dynamic";

const PROFILE_SECTIONS = [
  ["Mission & focus", "What they do, where, and the issues they work on."],
  ["Track record", "Milestones and outcome metrics the organization stands behind."],
  ["Networks", "Coalitions, partners and public agencies they work with."],
  ["Roadmap", "Where they are headed over the next one to three years."],
  ["Form 990 financials", "Budget, revenue mix, program spending, assets and staff."],
  ["Board & stewardship", "Who governs, audits, policies and how funders are kept informed."],
];

export default async function Home() {
  const orgs = await listApproved();
  const totalBudget = orgs.reduce((s, o) => s + o.financials.totalExpenses, 0);
  const counts = Object.fromEntries(CAUSES.map((c) => [c.slug, orgs.filter((o) => o.cause === c.slug).length]));

  return (
    <>
      <section className="border-b border-line">
        <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">For individual donors, foundations and corporate funders</p>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
              Find mid-size nonprofits worth backing — and see the receipts.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              JustCause profiles nonprofits with $1M–$50M budgets: big enough to have a track record, small enough
              that your gift moves the needle. Every profile is built on the organization&apos;s IRS Form 990.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/organizations" className="btn-primary">
                Browse the directory
              </Link>
              <Link href="/apply" className="btn-ghost">
                I run a nonprofit
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1">
            {[
              [String(orgs.length), "Organizations listed"],
              [money(totalBudget), "Combined annual budgets"],
              [String(CAUSES.length), "Cause areas"],
            ].map(([v, l]) => (
              <div key={l} className="border-l-2 border-accent pl-3 sm:pl-4">
                <dd className="font-serif text-2xl font-semibold sm:text-4xl">{v}</dd>
                <dt className="text-sm text-muted">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl font-semibold">Browse by cause</h2>
          <Link href="/causes" className="text-sm font-medium text-brand hover:underline">
            All causes →
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAUSES.map((c) => (
            <Link
              key={c.slug}
              href={`/causes/${c.slug}`}
              className="card group relative overflow-hidden p-5 hover:border-transparent"
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: c.color }} />
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-lg font-semibold group-hover:underline">{c.label}</h3>
                <span className="text-sm text-muted">{counts[c.slug]}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-card">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="eyebrow">What every profile includes</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold">The due diligence, done up front.</h2>
            <p className="mt-4 text-muted">
              Nonprofits can&apos;t be listed until they answer every section and upload their latest 990. Our team
              checks the figures against the filing before a profile goes live.
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {PROFILE_SECTIONS.map(([title, body], i) => (
              <li key={title} className="bg-card p-5">
                <span className="font-serif text-sm text-accent">0{i + 1}</span>
                <h3 className="mt-1 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl font-semibold">Recently listed</h2>
          <Link href="/organizations" className="text-sm font-medium text-brand hover:underline">
            Full directory →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...orgs]
            .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
            .slice(0, 6)
            .map((o) => (
              <OrgCard key={o.id} org={o} />
            ))}
        </div>
      </section>
    </>
  );
}
