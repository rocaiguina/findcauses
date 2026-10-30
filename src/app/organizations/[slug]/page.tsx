import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrgProfile } from "@/components/OrgProfile";
import { FundingOpportunities, MatchAside } from "@/components/OrgMatching";
import { pickSimilar } from "@/components/Profile";
import { getApprovedBySlug, listDirectory, profileEntry } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ m?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await getApprovedBySlug((await params).slug);
  return org ? { title: org.name, description: org.tagline } : { title: "Not found" };
}

export default async function OrganizationPage({ params, searchParams }: Props) {
  const { m } = await searchParams;
  const org = await getApprovedBySlug((await params).slug);
  if (!org) notFound();
  const entry = profileEntry(org);
  const similar = pickSimilar(await listDirectory(), {
    id: org.id,
    cause: org.cause,
    budget: org.financials.totalExpenses,
  });
  return (
    <OrgProfile
      org={org}
      form990Href={org.form990 ? `/organizations/${org.slug}/990` : undefined}
      similar={similar}
      asideTop={<MatchAside entry={entry} m={m} />}
      opportunities={<FundingOpportunities entry={entry} m={m} />}
    />
  );
}
