import type { Metadata } from "next";
import Link from "next/link";
import { CertifiedPill } from "@/components/CertifiedBadge";
import { Avatar } from "@/components/OrgCard";
import { searchWords } from "@/lib/format";
import { listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "For nonprofits",
  description: "Claim your nonprofit's page on FindCauses, complete your profile and get certified for funders.",
};

const STEPS = [
  {
    title: "Claim your page",
    text: "Your organization is likely already listed from IRS records. Sign in with your work email to claim it.",
  },
  {
    title: "Complete your profile",
    text: "Add your track record, board, roadmap, stewardship and the impact opportunities you need funded.",
  },
  {
    title: "Get certified",
    text: "With a recent Form 990 on record, you're FindCauses Certified. Put the badge on your website.",
  },
];

export default async function ForNonprofitsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const words = searchWords(q);
  const results = words.length
    ? (await listDirectory())
        .filter((e) => words.every((w) => e.searchText.includes(w)))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 20)
    : [];

  return (
    <div className="container-page max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">For nonprofits</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Show funders why you&apos;re worth funding.</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Foundation program officers use FindCauses to shortlist Puerto Rico nonprofits. Free for nonprofits.
      </p>

      <ol className="mt-10 grid gap-6 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <span className="text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-1 font-medium">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </li>
        ))}
      </ol>

      <form action="/for-nonprofits" className="mt-12 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Your organization's name or EIN"
          aria-label="Find your organization"
          className="field flex-1"
        />
        <button className="btn-primary">Find it</button>
      </form>
      <p className="mt-2 text-sm text-muted">
        Already manage a page?{" "}
        <Link href="/signin" className="text-link">
          Sign in
        </Link>
      </p>

      {q && (
        <section className="mt-8">
          {results.length ? (
            <ul>
              {results.map((e) => (
                <li key={e.id} className="flex items-center gap-4 border-b border-line py-4">
                  <Avatar name={e.name} cause={e.cause} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {e.name} {e.certified && <CertifiedPill />}
                    </p>
                    <p className="text-sm text-muted">{[e.city, e.state].filter(Boolean).join(", ")}</p>
                  </div>
                  {e.claimed ? (
                    <Link href={e.href} className="text-sm text-muted hover:underline underline-offset-4">
                      Claimed · view
                    </Link>
                  ) : (
                    <Link href={`/listings/${e.href.split("/").pop()}/claim`} className="btn-ghost">
                      Claim
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No organization matches “{q}”.</p>
          )}
          <p className="mt-6 text-sm text-muted">
            Not listed? We list 501(c)(3) public charities with $1M–$20M in annual expenses, recognized by the IRS for at least 10 years.{" "}
            <Link href="/apply" className="text-link">
              Apply to be listed
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
