import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrgProfile } from "@/components/OrgProfile";
import { getApprovedBySlug } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await getApprovedBySlug((await params).slug);
  return org ? { title: org.name, description: org.tagline } : { title: "Not found" };
}

export default async function OrganizationPage({ params }: Props) {
  const org = await getApprovedBySlug((await params).slug);
  if (!org) notFound();
  return <OrgProfile org={org} form990Href={org.form990 ? `/organizations/${org.slug}/990` : undefined} />;
}
