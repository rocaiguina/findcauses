import Link from "next/link";
import { getCause } from "@/lib/causes";
import { money, monthYear, tenure } from "@/lib/format";
import type { DirectoryEntry } from "@/lib/types";

export function CauseBadge({ slug }: { slug: string }) {
  const cause = getCause(slug);
  if (!cause) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: cause.color }}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cause.color }} />
      {cause.label}
    </span>
  );
}

/** Status labels for information an organization hasn't provided or we haven't verified. */
export function StatusPill({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-accent/70 bg-accent/5 px-2.5 py-0.5 text-xs font-semibold text-accent"
    >
      {children}
    </span>
  );
}

export function ExamplePill() {
  return (
    <span
      title="Fictional organization and opportunity, included to demonstrate the flow"
      className="inline-flex items-center rounded-full bg-[#5c3b96]/10 px-2 py-0.5 text-xs font-semibold text-[#5c3b96]"
    >
      Example
    </span>
  );
}

const SKIP = new Set(["de", "del", "la", "el", "los", "las", "y", "the", "of", "and", "for", "a", "en", "un", "una", "inc", "corp", "para", "pro"]);

export function initials(name: string): string {
  const words = name
    .replace(/\([^)]*\)/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !SKIP.has(w.toLowerCase()));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** Square monogram in the cause color, standing in for an organization's logo. */
export function Avatar({ name, cause, size = 56 }: { name: string; cause: string; size?: number }) {
  const color = getCause(cause)?.color ?? "#666";
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-md font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

function place(entry: DirectoryEntry) {
  return [entry.city, entry.state].filter(Boolean).join(", ");
}

function Facts({ entry }: { entry: DirectoryEntry }) {
  if (entry.budget == null)
    return (
      <StatusPill title="No Form 990 figures found in IRS data for this organization yet">990 not available yet</StatusPill>
    );
  const parts =
    entry.kind === "imported"
      ? [
          `Budget ${money(entry.budget)} (${entry.budgetYear})`,
          entry.revenue != null && `Revenue ${money(entry.revenue)}`,
          entry.netAssets != null && `Net assets ${money(entry.netAssets)}`,
        ]
      : [
          `Budget ${money(entry.budget)}`,
          entry.programShare != null && `${Math.round(entry.programShare * 100)}% to programs`,
          entry.staff != null && `${entry.staff} staff`,
        ];
  return <span className="text-xs text-muted">{parts.filter(Boolean).join(" · ")}</span>;
}

/** A search-result row, used in the directory list. */
export function OrgRow({ entry }: { entry: DirectoryEntry }) {
  return (
    <li className="flex gap-3 px-4 py-4 sm:gap-4">
      <Link href={entry.href} tabIndex={-1}>
        <Avatar name={entry.name} cause={entry.cause} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={entry.href} className="font-semibold leading-snug text-ink hover:text-brand hover:underline">
            {entry.name}
          </Link>
          {entry.example && <ExamplePill />}
          {entry.needs.length > 0 && (
            <span className="inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
              {entry.needs.length} {entry.needs.length === 1 ? "opportunity" : "opportunities"} seeking funding
            </span>
          )}
          {entry.kind === "imported" && (
            <StatusPill title="Imported from a public directory; not yet claimed by the organization">Unclaimed</StatusPill>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-ink">{entry.summary}</p>
        <p className="mt-0.5 text-sm text-muted">
          {place(entry)}
          {entry.irsSince && (
            <span title={`IRS tax-exempt since ${monthYear(entry.irsSince)}`}>
              {" "}· IRS-recognized {tenure(entry.irsSince)}
            </span>
          )}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <CauseBadge slug={entry.cause} />
          <Facts entry={entry} />
        </div>
      </div>
      <Link href={entry.href} className="btn-ghost hidden self-center sm:inline-flex">
        View
      </Link>
    </li>
  );
}

/** A suggestion card with a cover band, used on the home page. */
export function OrgCard({ entry }: { entry: DirectoryEntry }) {
  const color = getCause(entry.cause)?.color ?? "#666";
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="h-14" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }} />
      <div className="-mt-8 flex flex-1 flex-col items-center px-4 pb-4 text-center">
        <span className="rounded-md ring-4 ring-card">
          <Avatar name={entry.name} cause={entry.cause} size={64} />
        </span>
        <Link
          href={entry.href}
          className="mt-2 line-clamp-2 font-semibold leading-snug text-ink hover:text-brand hover:underline"
        >
          {entry.name}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{entry.summary}</p>
        <p className="mt-1 text-xs text-muted">
          {place(entry)}
          {entry.irsSince && <> · IRS-recognized {tenure(entry.irsSince)}</>}
        </p>
        <div className="mt-2">
          <Facts entry={entry} />
        </div>
        <div className="flex-1" />
        <Link href={entry.href} className="btn-ghost mt-4 w-full">
          View profile
        </Link>
      </div>
    </div>
  );
}
