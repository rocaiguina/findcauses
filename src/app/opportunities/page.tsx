import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AllOpportunities, type ListedOpportunity } from "./AllOpportunities";
import { CopyLinkButton, SubscribeCard } from "./ShortlistTools";
import { RememberAnswers, SaveAllButton, SaveButton } from "@/components/Save";
import { MatchBadge } from "@/components/Match";
import { Avatar, StatusPill } from "@/components/OrgCard";
import { ProjectDetail } from "@/components/ProjectDetail";
import { CAUSES } from "@/lib/causes";
import { describe, isAnswered, parseCriteria, toQuery } from "@/lib/criteria";
import { money, placeName } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import { opportunitiesFor } from "@/lib/match";
import { buildShortlist, SHORTLIST_SIZE } from "@/lib/shortlist";
import { getApprovedBySlug, getImportedBySlug, listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";
type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const answered = isAnswered(parseCriteria(await searchParams));
  return answered ? { title: "Your matches", robots: { index: false } } : { title: "Impact opportunities" };
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const criteria = parseCriteria(sp);
  const query = toQuery(criteria);
  // No answers: browse every posted opportunity. Partial answers: finish the questions.
  if (!isAnswered(criteria)) {
    if (query) redirect(`/find?${query}`);
    return (
      <div className="container-page max-w-4xl py-10 sm:py-14">
        <AllOpportunities items={await listAllOpportunities()} />
      </div>
    );
  }

  const more = sp.more === "1";
  const shortlist = buildShortlist(await listDirectory(), criteria, more ? SHORTLIST_SIZE * 2 : SHORTLIST_SIZE);
  const pick = typeof sp.pick === "string" ? sp.pick : undefined;
  const selected = shortlist.items.find((i) => i.opp.key === pick) ?? shortlist.items[0];

  const org =
    selected?.opp.entry.kind === "profile"
      ? await getApprovedBySlug(selected.opp.entry.href.replace("/organizations/", ""))
      : undefined;
  const listing =
    selected?.opp.entry.kind === "imported"
      ? await getImportedBySlug(selected.opp.entry.href.replace("/listings/", ""))
      : undefined;

  const causeNames = criteria.causes.map((c) => CAUSES.find((x) => x.slug === c)?.label).join(" and ");
  const href = (extra: Record<string, string>) => `/opportunities?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), ...(more ? { more: "1" } : {}), ...extra })}`;

  return (
    <div className="container-page py-6">
      <section className="card px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Your matches</h1>
            <p className="mt-0.5 text-sm text-muted">
              We reviewed {shortlist.considered.toLocaleString("en-US")} {causeNames} organizations
              {criteria.place === "any" ? "" : ` in ${placeName(criteria.place)}`} ({shortlist.posting} with posted
              opportunities). These {shortlist.items.length} fit you best.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RememberAnswers query={query} />
            <SaveAllButton entryKeys={shortlist.items.map((i) => `${i.opp.entry.kind}-${i.opp.entry.id}`)} />
            <Link href={`/find?${query}`} className="btn-muted">
              Edit answers
            </Link>
            <CopyLinkButton />
            <a href={`/opportunities/export?${query}${more ? "&more=1" : ""}`} className="btn-ghost">
              Download CSV
            </a>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {describe(criteria).map((d) => (
            <span key={d} className="chip">
              {d}
            </span>
          ))}
        </div>
      </section>

      {shortlist.items.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <p className="text-lg font-semibold">No organizations match those answers yet.</p>
          <Link href={`/find?${query}`} className="btn-primary mt-4">
            Change your answers
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <ol className="card divide-y divide-line overflow-hidden">
              {shortlist.items.map((item, i) => {
                const on = item.opp.key === selected.opp.key;
                const e = item.opp.entry;
                return (
                  <li key={item.opp.key} className="relative">
                    <div className="absolute right-2 top-2 z-10">
                      <SaveButton entryKey={`${e.kind}-${e.id}`} compact />
                    </div>
                    <Link
                      href={`${href({ pick: item.opp.key })}#detail`}
                      scroll={false}
                      aria-current={on ? "true" : undefined}
                      className={`flex gap-3 border-l-4 px-4 py-3 transition-colors ${
                        on ? "border-ink bg-black/[0.03]" : "border-transparent hover:bg-black/[0.03]"
                      }`}
                    >
                      <span className="w-4 shrink-0 pt-1 text-sm font-semibold text-muted">{i + 1}</span>
                      <Avatar name={e.name} cause={e.cause} size={44} />
                      <div className="min-w-0 flex-1 pr-6">
                        <p className="font-medium leading-snug text-ink">{item.opp.title}</p>
                        <p className="text-sm">{e.name}</p>
                        <p className="text-xs text-muted">
                          {[e.city, placeName(e.state)].filter(Boolean).join(", ")} ·{" "}
                          {item.opp.amount != null ? money(item.opp.amount) : "Amount not posted"} ·{" "}
                          {fundingTypeLabel(item.opp.type)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <MatchBadge result={item.result} />
                          {item.opp.implied && <StatusPill>No opportunity posted</StatusPill>}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
            {!more && shortlist.remaining > 0 && (
              <Link href={href({ more: "1" })} className="block text-center text-sm font-semibold text-muted hover:text-ink hover:underline">
                Not quite right? Show the next {Math.min(SHORTLIST_SIZE, shortlist.remaining)}
              </Link>
            )}
            <SubscribeCard query={query} />
          </div>
          <div id="detail" className="scroll-mt-16 lg:sticky lg:top-16 lg:self-start">
            <ProjectDetail item={selected} org={org} listing={listing} query={query} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Every opportunity a nonprofit posted, for the browse list. */
async function listAllOpportunities(): Promise<ListedOpportunity[]> {
  return (await listDirectory())
    .flatMap(opportunitiesFor)
    .filter((o) => !o.implied)
    .map((o) => ({
      key: o.key,
      entryKey: `${o.entry.kind}-${o.entry.id}`,
      href: o.entry.href,
      title: o.title,
      description: o.need?.description ?? "",
      orgName: o.entry.name,
      place: [o.entry.city, placeName(o.entry.state)].filter(Boolean).join(", "),
      cause: o.entry.cause,
      causes: o.entry.causes,
      approaches: o.entry.approaches,
      type: o.type,
      amount: o.amount,
      timeframe: o.need?.timeframe ?? null,
    }));
}
