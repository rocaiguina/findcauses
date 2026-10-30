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
    <div className="container-page py-6">
      <h1 className="sr-only">Nonprofit directory</h1>
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
