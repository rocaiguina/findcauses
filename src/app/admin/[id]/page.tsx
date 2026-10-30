import Link from "next/link";
import { notFound } from "next/navigation";
import { review } from "../actions";
import { OrgProfile } from "@/components/OrgProfile";
import { getById } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const org = await getById((await params).id);
  if (!org) notFound();

  return (
    <>
      <div className="border-b border-accent/40 bg-accent/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
          <div>
            <Link href="/admin" className="text-muted hover:text-brand">
              ← Review queue
            </Link>
            <span className="ml-3">
              Status: <strong className="capitalize">{org.status}</strong> · submitted {org.submittedAt.slice(0, 10)}
              {org.form990 && <> · 990 file: {org.form990.fileName}</>}
            </span>
          </div>
          <div className="flex gap-2">
            {org.status !== "rejected" && (
              <form action={review.bind(null, org.id, "rejected")}>
                <button className="btn-ghost !py-2">Reject</button>
              </form>
            )}
            {org.status !== "approved" && (
              <form action={review.bind(null, org.id, "approved")}>
                <button className="btn-primary !py-2">Approve & publish</button>
              </form>
            )}
          </div>
        </div>
      </div>
      <OrgProfile org={org} form990Href={org.form990 ? `/admin/${org.id}/990` : undefined} />
    </>
  );
}
