import Link from "next/link";
import { Avatar, StatusPill, initials } from "./OrgCard";
import { getCause } from "@/lib/causes";
import { tenure } from "@/lib/format";
import type { DirectoryEntry } from "@/lib/types";

// Building blocks for organization pages, laid out like a professional profile:
// a top card with cover and logo, stacked section cards, and a sidebar.

export type Highlight = { value: React.ReactNode; label: string; title?: string };

export function ProfileShell({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="container-page grid gap-4 py-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-2">{children}</div>
      <aside className="space-y-2">{aside}</aside>
    </div>
  );
}

export function ProfileTopCard({
  name,
  cause,
  headline,
  meta,
  badges,
  actions,
  highlights,
  note,
}: {
  name: string;
  cause: string;
  headline?: React.ReactNode;
  meta: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  highlights: Highlight[];
  note?: React.ReactNode;
}) {
  const color = getCause(cause)?.color ?? "#666";
  return (
    <section className="card overflow-hidden">
      <div
        className="h-24 sm:h-36"
        style={{
          // Soft neutral halo with a faint hint of the cause color.
          background: `radial-gradient(120% 140% at 85% 120%, ${color}22 0%, #e6e7ea 35%, #f4f4f2 60%, #eceef3 100%)`,
        }}
      />
      <div className="px-4 pb-5 sm:px-6">
        <div className="-mt-12 sm:-mt-16">
          <span className="inline-block rounded-full bg-card p-1 shadow-sm">
            <span className="hidden sm:block">
              <Avatar name={name} cause={cause} size={120} />
            </span>
            <span className="sm:hidden">
              <Avatar name={name} cause={cause} size={88} />
            </span>
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold leading-tight">{name}</h1>
        {headline && <p className="mt-1 text-base text-ink">{headline}</p>}
        <p className="mt-1 text-sm text-muted">{meta}</p>
        {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}
        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {highlights.length > 0 && (
        <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-5">
          {highlights.map((h) => (
            <div key={h.label} className="border-b border-r border-line px-4 py-3 last:border-r-0 sm:px-6" title={h.title}>
              <dd className="text-lg font-semibold">{h.value}</dd>
              <dt className="text-xs text-muted">{h.label}</dt>
            </div>
          ))}
        </dl>
      )}
      {note && <p className="px-4 pb-3 pt-2 text-xs text-muted sm:px-6">{note}</p>}
    </section>
  );
}

export function ProfileSection({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-16 px-4 py-5 sm:px-6">
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A section that hasn't been provided yet, in the same style as the "Unclaimed" label. */
export function MissingSection({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <ProfileSection title={title}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <StatusPill>Not available yet</StatusPill>
        {children}
      </div>
    </ProfileSection>
  );
}

/** Experience-style list item: a small square, a bold title, a muted subtitle and a description. */
export function TimelineItem({
  badge,
  title,
  subtitle,
  children,
}: {
  badge: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 py-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-paper text-xs font-semibold text-muted">
        {badge}
      </span>
      <div className="min-w-0 border-b border-line pb-3 [li:last-child_&]:border-0">
        <p className="font-semibold leading-snug">{title}</p>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        {children && <p className="mt-1 text-sm">{children}</p>}
      </div>
    </li>
  );
}

/** A person row with a round initials avatar. */
export function PersonRow({ name, line }: { name: string; line: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d0d8e0] text-sm font-semibold text-[#3c4a59]">
        {initials(name)}
      </span>
      <div className="min-w-0">
        <p className="font-semibold leading-snug">{name}</p>
        <p className="text-sm text-muted">{line}</p>
      </div>
    </li>
  );
}

export function SimilarOrgs({ entries }: { entries: DirectoryEntry[] }) {
  if (!entries.length) return null;
  return (
    <div className="card px-4 py-4">
      <p className="font-semibold">Similar organizations</p>
      <ul className="mt-2 divide-y divide-line">
        {entries.map((e) => (
          <li key={`${e.kind}-${e.id}`} className="flex gap-3 py-3">
            <Avatar name={e.name} cause={e.cause} size={48} />
            <div className="min-w-0 flex-1">
              <Link href={e.href} className="line-clamp-2 text-sm font-semibold leading-snug hover:underline underline-offset-4">
                {e.name}
              </Link>
              <p className="line-clamp-1 text-xs text-muted">{e.summary}</p>
              <p className="text-xs text-muted">
                {[e.city, e.state].filter(Boolean).join(", ")}
                {e.irsSince && <> · {tenure(e.irsSince)}</>}
              </p>
              <Link href={e.href} className="btn-muted mt-2 !min-h-7 !px-3 !py-0.5 !text-xs">
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Picks organizations in the same cause, preferring those with 990 figures closest in budget. */
export function pickSimilar(all: DirectoryEntry[], self: { id: string; cause: string; budget?: number }, n = 5) {
  return all
    .filter((e) => e.id !== self.id && e.cause === self.cause)
    .sort((a, b) => {
      const da = a.budget == null ? Infinity : Math.abs(Math.log((a.budget || 1) / (self.budget || 1_000_000)));
      const db = b.budget == null ? Infinity : Math.abs(Math.log((b.budget || 1) / (self.budget || 1_000_000)));
      return da - db || a.name.localeCompare(b.name);
    })
    .slice(0, n);
}
