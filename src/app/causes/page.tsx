import type { Metadata } from "next";
import Link from "next/link";
import { CAUSES } from "@/lib/causes";
import { money } from "@/lib/format";
import { listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Causes" };

export default async function CausesPage() {
  const entries = await listDirectory();
  return (
    <div className="container-page py-12">
      <p className="eyebrow">Causes</p>
      <h1 className="mt-2 text-4xl font-semibold">{CAUSES.length} areas of work</h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {CAUSES.map((c) => {
          const inCause = entries.filter((o) => o.causes.includes(c.slug));
          const budget = inCause.reduce((s, o) => s + (o.budget ?? 0), 0);
          return (
            <Link key={c.slug} href={`/causes/${c.slug}`} className="card group flex gap-5 p-6">
              <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <div>
                <h2 className="text-2xl font-semibold group-hover:underline">{c.label}</h2>
                <p className="mt-1 text-muted">{c.blurb}</p>
                <p className="mt-4 text-sm">
                  <span className="font-semibold">{inCause.length}</span> organizations
                  {budget > 0 && (
                    <>
                      {" "}· <span className="font-semibold">{money(budget)}</span> combined budgets
                    </>
                  )}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
