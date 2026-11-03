import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CertifiedChecklist } from "@/components/CertifiedBadge";
import { CopyField } from "@/components/CopyField";
import { SignOutButton } from "@/components/SignOutButton";
import { getMe } from "@/lib/store";
import type { Me } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your organizations", robots: { index: false } };

type Claim = Me["claims"][number];

const STATUS: Record<Claim["status"], string> = {
  active: "Verified",
  pending: "Waiting for our review",
  rejected: "Not approved",
};

export default async function DashboardPage() {
  const me = await getMe();
  if (!me.user) redirect("/signin?next=/dashboard");
  const h = await headers();
  const origin = process.env.SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <div className="container-page max-w-3xl py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">For nonprofits</p>
          <h1 className="mt-2 text-3xl font-semibold">Your organizations</h1>
        </div>
        <p className="text-sm text-muted">
          {me.user.email} · <SignOutButton />
        </p>
      </div>

      {me.claims.length === 0 && (
        <div className="card mt-8 p-6">
          <p className="font-medium">You don&apos;t manage an organization yet.</p>
          <p className="mt-1 text-sm text-muted">
            Find your nonprofit in the directory and claim its page. Not listed?{" "}
            <Link href="/apply" className="text-link">
              Apply to be listed
            </Link>
            .
          </p>
          <Link href="/for-nonprofits" className="btn-primary mt-4">
            Find your organization
          </Link>
        </div>
      )}

      <ul className="mt-8 space-y-6">
        {me.claims.map((c) => (
          <ClaimCard key={c.id} claim={c} origin={origin} />
        ))}
      </ul>
    </div>
  );
}

function ClaimCard({ claim: c, origin }: { claim: Claim; origin: string }) {
  const org = c.organization;
  const pageHref = org.profileStatus === "published" ? `/organizations/${org.slug}` : `/listings/${org.slug}`;
  const certified = org.check.claimed && org.check.profile && org.check.recent990;
  const embed = `<a href="${origin}${pageHref}" target="_blank" rel="noopener"><img src="${origin}/badge/${org.slug}" alt="${org.name.replace(/"/g, "")} on FindCauses" width="220" height="56"></a>`;

  return (
    <li className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={pageHref} className="text-lg font-semibold hover:underline underline-offset-4">
            {org.name}
          </Link>
          <p className="mt-0.5 text-sm text-muted">
            {STATUS[c.status]}
            {c.status === "active" && c.method === "domain" && " by your email domain"}
            {org.profileStatus === "pending" && " · profile submitted, awaiting review"}
          </p>
        </div>
        {c.status === "active" && org.profileStatus !== "pending" && (
          <Link href={`/dashboard/${org.slug}/profile`} className="btn-primary">
            {org.profileStatus === "published" ? "Edit profile" : "Complete your profile"}
          </Link>
        )}
      </div>

      {c.status === "pending" && (
        <p className="mt-4 text-sm text-muted">
          We&apos;ll confirm you work at {org.name} and email you, usually within 2 business days.
        </p>
      )}

      {c.status === "active" && (
        <div className="mt-6 grid gap-6 border-t border-line pt-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">{certified ? "You're FindCauses Certified" : "Get FindCauses Certified"}</p>
            <div className="mt-3">
              <CertifiedChecklist check={org.check} />
            </div>
            {!org.check.recent990 && (
              <p className="mt-3 text-xs text-muted">
                No 990 from the last 3 tax years in IRS data yet: upload your latest one in your profile and we&apos;ll
                verify it.
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Badge for your website</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/badge/${org.slug}`} alt="" width={220} height={56} className="mt-3" />
            <p className="mt-2 text-xs text-muted">
              {certified
                ? "Shows Certified for as long as you qualify."
                : "Shows “Listed nonprofit” now and switches to Certified on its own once you qualify."}
            </p>
            <div className="mt-3">
              <CopyField label="Embed code" value={embed} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
