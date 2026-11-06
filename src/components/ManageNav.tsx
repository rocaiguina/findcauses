"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROFILE_SECTIONS } from "@/lib/profileSections";

/** The section list beside the editor: a sidebar on desktop, a row that scrolls sideways on phones. */
export function ManageNav({ slug, sections }: { slug: string; sections: Record<string, boolean> }) {
  const pathname = usePathname();
  const base = `/dashboard/${slug}`;
  const link = (active: boolean) =>
    `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
      active ? "bg-brand-soft font-medium text-brand-dark" : "text-ink/80 hover:bg-black/[0.04]"
    }`;
  return (
    <nav aria-label="Manage your profile" className="relative -mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      <Link href={base} className={link(pathname === base)} aria-current={pathname === base ? "page" : undefined}>
        <span aria-hidden className="grid h-4 w-4 place-items-center text-muted">
          ⌂
        </span>
        Overview
      </Link>
      <p className="eyebrow mt-3 hidden px-3 pb-1 lg:block">Your profile</p>
      {PROFILE_SECTIONS.map((s) => {
        const href = `${base}/${s.key}`;
        const done = sections[s.key];
        return (
          <Link key={s.key} href={href} className={link(pathname === href)} aria-current={pathname === href ? "page" : undefined}>
            <span
              aria-hidden
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] ${done ? "bg-brand text-white" : "border border-line bg-card"}`}
            >
              {done ? "✓" : ""}
            </span>
            {s.title}
            <span className="sr-only">{done ? " (complete)" : " (to do)"}</span>
          </Link>
        );
      })}
    </nav>
  );
}
