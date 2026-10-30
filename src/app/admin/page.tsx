import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "./actions";
import { CauseBadge } from "@/components/OrgCard";
import { money } from "@/lib/format";
import { listByStatus, usingSnapshot } from "@/lib/store";
import type { OrgStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review queue", robots: { index: false } };

const TABS: { status: OrgStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const requested = (await searchParams).status;
  const status = TABS.find((t) => t.status === requested)?.status ?? "pending";
  const orgs = await listByStatus(status);

  return (
    <div className="container-page py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold">Review queue</h1>
        </div>
        <form action={logout}>
          <button className="text-sm text-muted hover:text-brand">Sign out</button>
        </form>
      </div>
      {usingSnapshot && (
        <p className="mt-4 rounded-lg border border-dashed border-accent/60 bg-accent/5 p-3 text-sm">
          Read-only: the site is running on the JSON snapshot, so new applications are saved to Netlify Blobs and can
          be reviewed here, but approving them needs a database.
        </p>
      )}
      <nav className="mt-6 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin?status=${t.status}`}
            className={`rounded-full px-4 py-1.5 text-sm ${t.status === status ? "bg-brand text-white" : "border border-line bg-card"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Cause</th>
              <th className="px-4 py-3 font-medium">Budget</th>
              <th className="px-4 py-3 font-medium">EIN</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-muted">
                    {o.city}, {o.state}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <CauseBadge slug={o.cause} />
                </td>
                <td className="px-4 py-3 tabular-nums">{money(o.financials.totalExpenses)}</td>
                <td className="px-4 py-3 tabular-nums">{o.ein}</td>
                <td className="px-4 py-3 text-muted">{o.submittedAt.slice(0, 10)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/${o.id}`} className="font-semibold text-brand hover:underline">
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
            {!orgs.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
