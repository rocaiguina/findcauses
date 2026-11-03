import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { getImportedBySlug, getMe } from "@/lib/store";
import { ClaimForm } from "./ClaimForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Claim your organization", robots: { index: false } };

const domainOf = (website: string | null) => {
  try {
    return website ? new URL(website).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
};

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [listing, me] = await Promise.all([getImportedBySlug(slug), getMe()]);
  if (!listing) notFound();
  if (!me.user) redirect(`/signin?next=${encodeURIComponent(`/listings/${slug}/claim`)}`);
  if (me.claims.some((c) => c.organization.slug === slug)) redirect("/dashboard");

  const domain = domainOf(listing.website);
  const matches = domain && me.user.email.endsWith(`@${domain}`);
  return (
    <div className="container-page max-w-md py-16">
      <p className="eyebrow">Claim your organization</p>
      <h1 className="mt-2 text-3xl font-semibold">{listing.name}</h1>
      <p className="mt-3 text-sm text-muted">
        Signed in as <span className="text-ink">{me.user.email}</span>.{" "}
        {matches ? (
          <>Your email is on {domain}, so you&apos;ll be verified right away.</>
        ) : domain ? (
          <>
            Your email isn&apos;t on {domain}, so our team will confirm you work there before you can edit the page
            (usually within 2 business days).{" "}
            <SignOutButton next={`/signin?next=${encodeURIComponent(`/listings/${slug}/claim`)}`}>
              Use a different email
            </SignOutButton>
          </>
        ) : (
          <>Our team will confirm you work there before you can edit the page (usually within 2 business days).</>
        )}
      </p>
      <ClaimForm slug={slug} />
    </div>
  );
}
