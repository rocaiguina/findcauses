import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  // Someone with a single organization goes straight to managing it.
  if (me.claims.length === 1 && me.claims[0].status === "active") redirect(`/dashboard/${me.claims[0].organization.slug}`);

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
          <ClaimCard key={c.id} claim={c} />
        ))}
      </ul>
    </div>
  );
}

function ClaimCard({ claim: c }: { claim: Claim }) {
  const org = c.organization;
  const pageHref = org.profileStatus === "published" ? `/organizations/${org.slug}` : `/listings/${org.slug}`;

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
        {c.status === "active" && (
          <Link href={`/dashboard/${org.slug}`} className="btn-primary">
            Manage
          </Link>
        )}
      </div>

      {c.status === "pending" && (
        <p className="mt-4 text-sm text-muted">
          We&apos;ll confirm you work at {org.name} and email you, usually within 2 business days.
        </p>
      )}
    </li>
  );
}
