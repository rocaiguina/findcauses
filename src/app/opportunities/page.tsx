import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyLinkButton, SubscribeCard } from "./ShortlistTools";
import { MatchBadge } from "@/components/Match";
import { Avatar, ExamplePill, StatusPill } from "@/components/OrgCard";
import { ProjectDetail } from "@/components/ProjectDetail";
import { CAUSES } from "@/lib/causes";
import { describe, isAnswered, parseCriteria, toQuery } from "@/lib/criteria";
import { money, placeName } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import { buildShortlist, SHORTLIST_SIZE } from "@/lib/shortlist";
import { getById, getImportedBySlug, listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your shortlist", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const criteria = parseCriteria(sp);
  const query = toQuery(criteria);
  if (!isAnswered(criteria)) redirect(`/find${query ? `?${query}` : ""}`);

  const more = sp.more === "1";
  const shortlist = buildShortlist(await listDirectory(), criteria, more ? SHORTLIST_SIZE * 2 : SHORTLIST_SIZE);
  const pick = typeof sp.pick === "string" ? sp.pick : undefined;
  const selected = shortlist.items.find((i) => i.opp.key === pick) ?? shortlist.items[0];

  const org = selected?.opp.entry.kind === "profile" ? await getById(selected.opp.entry.id) : undefined;
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
            <h1 className="text-xl font-semibold">Your shortlist</h1>
            <p className="mt-0.5 text-sm text-muted">
              We reviewed {shortlist.considered.toLocaleString("en-US")} {causeNames} organizations
              {criteria.place === "any" ? "" : ` in ${placeName(criteria.place)}`} ({shortlist.posting} with posted
              opportunities). These {shortlist.items.length} fit you best.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
                  <li key={item.opp.key}>
                    <Link
                      href={`${href({ pick: item.opp.key })}#detail`}
                      scroll={false}
                      aria-current={on ? "true" : undefined}
                      className={`flex gap-3 border-l-4 px-4 py-3 transition-colors ${
                        on ? "border-brand bg-brand-soft/60" : "border-transparent hover:bg-black/[0.03]"
                      }`}
                    >
                      <span className="w-4 shrink-0 pt-1 text-sm font-semibold text-muted">{i + 1}</span>
                      <Avatar name={e.name} cause={e.cause} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-brand">{item.opp.title}</p>
                        <p className="text-sm">{e.name}</p>
                        <p className="text-xs text-muted">
                          {[e.city, placeName(e.state)].filter(Boolean).join(", ")} ·{" "}
                          {item.opp.amount != null ? money(item.opp.amount) : "Amount not posted"} ·{" "}
                          {fundingTypeLabel(item.opp.type)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <MatchBadge result={item.result} />
                          {item.opp.implied && <StatusPill>No opportunity posted</StatusPill>}
                          {e.example && <ExamplePill />}
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
