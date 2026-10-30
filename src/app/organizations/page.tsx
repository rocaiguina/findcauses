import type { Metadata } from "next";
import { DirectoryBrowser } from "@/components/DirectoryBrowser";
import { isCauseSlug } from "@/lib/causes";
import { listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Directory" };

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cause?: string; q?: string }>;
}) {
  const { cause, q } = await searchParams;
  const entries = await listDirectory();
  const initialCause = cause && isCauseSlug(cause) ? cause : "";
  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <h1 className="text-4xl font-normal tracking-[-0.02em] sm:text-[44px]">Directory</h1>
      <p className="mb-8 mt-3 max-w-xl text-lg text-muted">
        Mid-size Puerto Rico nonprofits, with budgets and history from their IRS Form 990 filings.
      </p>
      {/* Remount on a new top-bar search so the filters pick up the new query. */}
      <DirectoryBrowser
        key={`${q ?? ""}|${initialCause}`}
        entries={entries}
        initialCause={initialCause}
        initialQuery={q ?? ""}
      />
    </div>
  );
}
