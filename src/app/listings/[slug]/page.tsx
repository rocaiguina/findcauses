import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IrsFinancials } from "@/components/IrsFinancials";
import { FundingOpportunities, MatchAside } from "@/components/OrgMatching";
import { CauseBadge, StatusPill } from "@/components/OrgCard";
import { SaveButton } from "@/components/Save";
import {
  MissingSection,
  ProfileSection,
  ProfileShell,
  ProfileTopCard,
  SimilarOrgs,
  pickSimilar,
  type Highlight,
} from "@/components/Profile";
import { MID_SIZE_MAX_BUDGET, MID_SIZE_MIN_BUDGET } from "@/lib/config";
import { money, monthYear, tenure } from "@/lib/format";
import { RULING_DATE_NOTE } from "@/lib/irs";
import { getImportedBySlug, importedEntry, listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ m?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getImportedBySlug((await params).slug);
  return listing ? { title: listing.name, robots: { index: false } } : { title: "Not found" };
}

export default async function ListingPage({ params, searchParams }: Props) {
  const { m } = await searchParams;
  const l = await getImportedBySlug((await params).slug);
  if (!l) notFound();
  if (l.profileSlug) redirect(`/organizations/${l.profileSlug}`);
  const entry = importedEntry(l);
  const similar = pickSimilar(await listDirectory(), { id: l.id, causes: l.causes, budget: entry.budget });

  const latest = l.filings.find((f) => f.totalExpenses != null);
  const midSize =
    latest?.totalExpenses != null &&
    latest.totalExpenses >= MID_SIZE_MIN_BUDGET &&
    latest.totalExpenses <= MID_SIZE_MAX_BUDGET;

  const highlights: Highlight[] = [
    {
      value: l.irsRulingDate ? tenure(l.irsRulingDate) : <StatusPill>Not available yet</StatusPill>,
      label: l.irsRulingDate ? `Recognized by the IRS (since ${monthYear(l.irsRulingDate)})` : "Recognized by the IRS",
      title: RULING_DATE_NOTE,
    },
    ...(latest
      ? [
          { value: money(latest.totalExpenses ?? 0), label: `Annual budget (FY${latest.taxYear})` },
          { value: latest.totalRevenue == null ? "—" : money(latest.totalRevenue), label: "Revenue" },
          { value: latest.netAssets == null ? "—" : money(latest.netAssets), label: "Net assets" },
          { value: midSize ? "Yes" : "No", label: "Mid-size ($1M–$50M)" },
        ]
      : [{ value: <StatusPill>990 not available yet</StatusPill>, label: "Annual budget" }]),
  ];

  return (
    <ProfileShell
      aside={
        <>
          <MatchAside entry={entry} m={m} />
          {!l.claimed && (
            <div className="card p-4">
              <p className="font-semibold">Is this your organization?</p>
              <p className="mt-1 text-sm text-muted">
                Claim this page to show funders your track record, roadmap, board, stewardship and funding needs.
                It&apos;s free.
              </p>
              <Link href={`/listings/${l.slug}/claim`} className="btn-ghost mt-3 w-full">
                Claim this page
              </Link>
            </div>
          )}
          <SimilarOrgs entries={similar} />
        </>
      }
    >
      <ProfileTopCard
        name={l.name}
        cause={l.cause}
        headline={l.tags.length ? l.tags.slice(0, 4).join(" · ") : undefined}
        meta={
          <>
            {[l.city, l.state].filter(Boolean).join(", ")}
            {l.ein && <> · EIN {l.ein.replace(/^(\d{2})(\d{7})$/, "$1-$2")}</>}
            {l.nteeCode && <> · NTEE {l.nteeCode}</>}
          </>
        }
        badges={
          <>
            {l.causes.map((c) => (
              <CauseBadge key={c} slug={c} />
            ))}
            {l.claimed ? (
              <span className="text-xs text-muted">Claimed by the organization</span>
            ) : (
              <StatusPill title="Not yet claimed by the organization">Unclaimed</StatusPill>
            )}
          </>
        }
        actions={
          <>
            <SaveButton entryKey={`imported-${l.id}`} />
            {l.email && (
              <a href={`mailto:${l.email}`} className="btn-primary">
                Message
              </a>
            )}
            {l.website && (
              <a href={l.website} target="_blank" rel="noopener noreferrer nofollow" className="btn-ghost">
                Website ↗
              </a>
            )}
            {l.phone && (
              <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`} className="btn-muted">
                {l.phone}
              </a>
            )}
          </>
        }
        highlights={highlights}
        note={l.irsRulingDate ? RULING_DATE_NOTE : undefined}
      />

      {l.mission ? (
        <ProfileSection title="About">
          <p className="whitespace-pre-line text-sm leading-relaxed">{l.mission}</p>
        </ProfileSection>
      ) : (
        <MissingSection title="About">The organization hasn&apos;t added its mission yet.</MissingSection>
      )}

      <FundingOpportunities entry={entry} m={m} />

      <ProfileSection title="Financials" subtitle="From IRS Form 990 filings">
        <IrsFinancials filings={l.filings} ein={l.ein} irsName={l.irsName} matchScore={l.irsMatchScore} />
      </ProfileSection>

      {["Track record", "Board of directors", "Networks & partners", "Roadmap", "Stewardship & audit"].map((t) => (
        <MissingSection key={t} title={t}>
          Appears once the organization completes its profile.
        </MissingSection>
      ))}
    </ProfileShell>
  );
}
