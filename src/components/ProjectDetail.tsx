import Link from "next/link";
import { MatchBadge, ReasonList } from "./Match";
import { Avatar, CauseBadge, ExamplePill, StatusPill, initials } from "./OrgCard";
import { money, monthYear, placeName, tenure } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import { linkedinCompanySearch, linkedinPeopleSearch } from "@/lib/linkedin";
import type { ShortlistItem } from "@/lib/shortlist";
import type { ImportedListing, Organization } from "@/lib/types";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-paper px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5 sm:px-6">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** The selected shortlist item, laid out like a job post: facts, why it fits, the opportunity, the org, who to contact. */
export function ProjectDetail({
  item,
  org,
  listing,
  query,
}: {
  item: ShortlistItem;
  org?: Organization;
  listing?: ImportedListing;
  query: string;
}) {
  const { opp, result } = item;
  const e = opp.entry;
  const mission = org?.mission ?? listing?.mission;
  const email = org?.contact.email ?? listing?.email;
  const website = org?.website ?? listing?.website;
  const people: { name: string; role: string }[] = org
    ? [{ name: org.contact.name, role: org.contact.title }, ...org.board.map((b) => ({ name: b.name, role: `Board ${b.role.toLowerCase()}` }))]
    : [];

  return (
    <article className="card overflow-hidden">
      <header className="px-5 pb-5 pt-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Avatar name={e.name} cause={e.cause} size={48} />
          <div className="min-w-0">
            <Link href={`${e.href}?m=${encodeURIComponent(query)}`} className="font-semibold hover:text-brand hover:underline">
              {e.name}
            </Link>
            <p className="text-sm text-muted">
              {[e.city, placeName(e.state)].filter(Boolean).join(", ")}
              {e.irsSince && <> · IRS-recognized {tenure(e.irsSince)}</>}
            </p>
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-semibold leading-tight">{opp.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <MatchBadge result={result} />
          <CauseBadge slug={e.cause} />
          {opp.implied ? (
            <StatusPill>No opportunity posted yet</StatusPill>
          ) : (
            <span className="inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
              Seeking funding
            </span>
          )}
          {e.example && <ExamplePill />}
          {e.kind === "imported" && <StatusPill>Unclaimed listing</StatusPill>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={linkedinCompanySearch(e.name)} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Find on LinkedIn ↗
          </a>
          <a href={linkedinPeopleSearch(e.name)} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            People who work there ↗
          </a>
          {email && (
            <a href={`mailto:${email}`} className="btn-muted">
              Email
            </a>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="btn-muted">
              Website ↗
            </a>
          )}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Fact label="Amount sought" value={opp.amount != null ? money(opp.amount) : <span className="text-muted">Not posted</span>} />
          <Fact label="Type" value={fundingTypeLabel(opp.type) + (opp.implied ? " (assumed)" : "")} />
          <Fact label="Timeframe" value={opp.need?.timeframe ?? <span className="text-muted">Not posted</span>} />
          <Fact label="Organization budget" value={e.budget != null ? `${money(e.budget)} (${e.budgetYear})` : <StatusPill>990 not available yet</StatusPill>} />
          <Fact label="Spent on programs" value={e.programShare != null ? `${Math.round(e.programShare * 100)}%` : "—"} />
          <Fact
            label="Recognized by the IRS"
            value={e.irsSince ? `Since ${monthYear(e.irsSince)}` : <span className="text-muted">Unknown</span>}
          />
        </dl>
      </header>

      <Block title="Why it's on your shortlist">
        <ReasonList reasons={result.reasons} />
        {result.highlights.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {result.highlights.map((h) => (
              <li key={h}>★ {h}</li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="The opportunity">
        {opp.implied ? (
          <p className="text-sm text-muted">
            This organization hasn&apos;t posted a specific opportunity. It matches what you fund, so it&apos;s worth asking what
            they&apos;re raising money for. We&apos;ve assumed general operating support.
          </p>
        ) : (
          <p className="text-sm leading-relaxed">{opp.need?.description}</p>
        )}
      </Block>

      <Block title="The organization">
        {mission ? <p className="text-sm leading-relaxed">{mission}</p> : <StatusPill>Mission not provided yet</StatusPill>}
        {org && org.trackRecord.length > 0 && (
          <ul className="mt-3 space-y-2">
            {org.trackRecord.map((t) => (
              <li key={t.title} className="flex gap-3 text-sm">
                <span className="w-10 shrink-0 font-semibold text-muted">{t.year}</span>
                <span>
                  <span className="font-semibold">{t.title}.</span> {t.description}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`${e.href}?m=${encodeURIComponent(query)}`}
          className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Full profile, financials and board →
        </Link>
      </Block>

      <Block title="Who to contact">
        {people.length ? (
          <ul className="divide-y divide-line">
            {people.slice(0, 4).map((p) => (
              <li key={p.name} className="flex items-center gap-3 py-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d0d8e0] text-xs font-semibold text-[#3c4a59]">
                  {initials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted">{p.role}</p>
                </div>
                <a
                  href={linkedinPeopleSearch(e.name, p.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost !min-h-7 !px-3 !py-0.5 !text-xs"
                >
                  LinkedIn ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No named contacts yet.{" "}
            <a
              href={linkedinPeopleSearch(e.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand hover:underline"
            >
              Search LinkedIn for people at {e.name}
            </a>
            {listing?.phone && <> or call {listing.phone}</>}.
          </p>
        )}
        {e.example && (
          <p className="mt-2 text-xs text-muted">This is an example organization; its people are fictional and won&apos;t be on LinkedIn.</p>
        )}
      </Block>
    </article>
  );
}
