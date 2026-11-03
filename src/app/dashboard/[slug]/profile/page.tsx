import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplicationForm } from "@/components/ApplicationForm";
import { getMe, getProfileForm } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your profile", robots: { index: false } };

export default async function ProfileEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await getMe()).user) redirect(`/signin?next=${encodeURIComponent(`/dashboard/${slug}/profile`)}`);
  const profile = await getProfileForm(slug);
  if (!profile) notFound();
  return (
    <div className="container-page max-w-4xl py-12">
      <Link href="/dashboard" className="text-sm text-muted hover:underline underline-offset-4">
        ← Your organizations
      </Link>
      <h1 className="mt-3 text-4xl font-semibold">{profile.organization.name}</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Funders see this profile instead of the basic IRS page. Every section is required; have your latest Form 990
        open, since most figures map to a specific line. We started you off with what IRS data already shows.
      </p>
      <div className="mt-10">
        <ApplicationForm profile={profile} />
      </div>
    </div>
  );
}
