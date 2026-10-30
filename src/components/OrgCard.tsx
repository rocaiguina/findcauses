import Link from "next/link";
import { getCause } from "@/lib/causes";
import { money, pct } from "@/lib/format";
import type { Organization } from "@/lib/types";

export function CauseBadge({ slug }: { slug: string }) {
  const cause = getCause(slug);
  if (!cause) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${cause.color}1a`, color: cause.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cause.color }} />
      {cause.label}
    </span>
  );
}

export function OrgCard({ org }: { org: Organization }) {
  const f = org.financials;
  return (
    <Link
      href={`/organizations/${org.slug}`}
      className="card group flex flex-col p-5 transition-shadow hover:shadow-[0_8px_30px_-12px_rgba(22,32,28,0.25)]"
    >
      <div className="flex items-start justify-between gap-3">
        <CauseBadge slug={org.cause} />
        {org.sample && <span className="chip">Sample</span>}
      </div>
      <h3 className="mt-3 font-serif text-xl font-semibold leading-snug group-hover:text-brand">{org.name}</h3>
      <p className="mt-1 text-sm text-muted">
        {org.city}, {org.state} · Founded {org.yearFounded}
      </p>
      <p className="mt-3 line-clamp-2 text-sm">{org.tagline}</p>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
        <div>
          <dt className="text-xs text-muted">Budget</dt>
          <dd className="font-semibold">{money(f.totalExpenses)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">To programs</dt>
          <dd className="font-semibold">{pct(f.programExpenses, f.totalExpenses)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Staff</dt>
          <dd className="font-semibold">{f.employees}</dd>
        </div>
      </dl>
    </Link>
  );
}
