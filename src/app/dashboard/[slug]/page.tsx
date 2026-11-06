import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CertifiedChecklist } from "@/components/CertifiedBadge";
import { CopyField } from "@/components/CopyField";
import { PROFILE_SECTIONS } from "@/lib/profileSections";
import { getProfileForm } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage your organization", robots: { index: false } };

export default async function ManageOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const { slug } = await params;
  const { published } = await searchParams;
  const form = await getProfileForm(slug);
  if (!form) notFound();
  const h = await headers();
  const origin = process.env.SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const live = form.profileStatus === "published";
  const locked = form.profileStatus === "pending" || form.profileStatus === "rejected";
  const done = PROFILE_SECTIONS.filter((s) => form.sections[s.key]).length;
  const next = PROFILE_SECTIONS.find((s) => !form.sections[s.key]);
  const certified = form.check.claimed && form.check.profile && form.check.recent990;
  const name = form.organization.name;
  const pageHref = live ? `/organizations/${slug}` : `/listings/${slug}`;
  const embed = `<a href="${origin}${pageHref}" target="_blank" rel="noopener"><img src="${origin}/badge/${slug}" alt="${name.replace(/"/g, "")} on FindCauses" width="220" height="56"></a>`;

  return (
    <div className="space-y-6">
      {published && (
        <div role="status" className="rounded-xl border border-brand/30 bg-brand-soft p-5">
          <p className="font-semibold text-brand-dark">Congratulations, you&apos;re published.</p>
          <p className="mt-1 text-sm text-ink/80">
            Funders now see it in the directory.{" "}
            <Link href={`/organizations/${slug}`} className="text-link">
              See your page
            </Link>
          </p>
        </div>
      )}

      {locked ? (
        <section className="card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">{form.profileStatus === "pending" ? "Your profile is with our team" : "Your profile wasn't approved"}</h2>
          <p className="mt-2 text-sm text-muted">
            {form.profileStatus === "pending"
              ? "We're checking it against your Form 990, usually within 5 business days. You can't edit it in the meantime."
              : "It isn't showing in the directory, and it can't be edited for now."}
          </p>
        </section>
      ) : live ? (
        <section className="card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Your profile is live</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Funders see it in the directory. Keep your impact opportunities current, since those are what funders act on.
          </p>
          <Link href={`/dashboard/${slug}/opportunities`} className="btn-primary mt-5">
            Update impact opportunities
          </Link>
        </section>
      ) : (
        <section className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">Finish your profile</h2>
            <p className="text-sm text-muted">
              {done} of {PROFILE_SECTIONS.length} sections
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={PROFILE_SECTIONS.length}
            aria-valuenow={done}
            className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06]"
          >
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / PROFILE_SECTIONS.length) * 100}%` }} />
          </div>
          <p className="mt-4 max-w-xl text-sm text-muted">
            Funders see your basic IRS page for now. What you save here stays private, and your full profile goes live
            on its own when the last section is done. Save as you go and come back any time.
          </p>
          {next && (
            <Link href={`/dashboard/${slug}/${next.key}`} className="btn-primary mt-5">
              {done ? "Continue" : "Start"}: {next.title}
            </Link>
          )}
        </section>
      )}

      <section className="card divide-y divide-line">
        {PROFILE_SECTIONS.map((s) => (
          <Link
            key={s.key}
            href={`/dashboard/${slug}/${s.key}`}
            className="group flex items-center justify-between gap-4 p-5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-black/[0.02]"
          >
            <span className="min-w-0">
              <span className="block font-medium group-hover:underline underline-offset-4">{s.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{s.blurb}</span>
            </span>
            <span className={`shrink-0 text-xs font-medium ${form.sections[s.key] ? "text-brand-dark" : "text-muted"}`}>
              {form.sections[s.key] ? "✓ Complete" : "To do"}
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="section-title">{certified ? "You're FindCauses Certified" : "Get FindCauses Certified"}</h2>
          <div className="mt-4">
            <CertifiedChecklist check={form.check} />
          </div>
          {!form.check.recent990 && (
            <p className="mt-4 text-xs text-muted">
              No 990 from the last 3 tax years in IRS data yet.{" "}
              <Link href={`/dashboard/${slug}/financials`} className="text-link">
                Upload your latest one
              </Link>{" "}
              and we&apos;ll verify it.
            </p>
          )}
        </section>
        <section className="card p-6">
          <h2 className="section-title">Badge for your website</h2>
          {/* The badge is cached for 10 minutes; a new URL shows the change as soon as they qualify. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/badge/${slug}?certified=${certified}`} alt="" width={220} height={56} className="mt-4" />
          <p className="mt-2 text-xs text-muted">
            {certified
              ? "Shows Certified for as long as you qualify."
              : "Shows “Listed nonprofit” now and switches to Certified on its own once you qualify."}
          </p>
          <div className="mt-3">
            <CopyField label="Embed code" value={embed} />
          </div>
        </section>
      </div>
    </div>
  );
}
