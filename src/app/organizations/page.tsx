import type { Metadata } from "next";
import { DirectoryBrowser } from "@/components/DirectoryBrowser";
import { isCauseSlug } from "@/lib/causes";
import { listApproved } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Directory" };

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ cause?: string }> }) {
  const { cause } = await searchParams;
  const orgs = await listApproved();
  return (
    <div className="container-page py-12">
      <p className="eyebrow">Directory</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">Mid-size nonprofits</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Filter by cause, budget size and location. Budgets are total annual expenses from each organization&apos;s
        latest Form 990.
      </p>
      <div className="mt-10">
        <DirectoryBrowser orgs={orgs} initialCause={cause && isCauseSlug(cause) ? cause : ""} />
      </div>
    </div>
  );
}
