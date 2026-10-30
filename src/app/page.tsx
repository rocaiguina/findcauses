import Link from "next/link";
import { Avatar, ExamplePill } from "@/components/OrgCard";
import { SaveButton } from "@/components/Save";
import { MID_SIZE_MAX_BUDGET, MID_SIZE_MIN_BUDGET } from "@/lib/config";
import { money, placeName } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import { ADDED_BY_JUSTCAUSE, isExample, opportunitiesFor } from "@/lib/match";
import { listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listDirectory();
  // Mid-size organizations' posted opportunities; real organizations before the fictional examples.
  const seeking = entries
    .filter((e) => e.budget == null || (e.budget >= MID_SIZE_MIN_BUDGET && e.budget <= MID_SIZE_MAX_BUDGET))
    .flatMap(opportunitiesFor)
    .filter((o) => !o.implied)
    .sort((a, b) => Number(Boolean(a.entry.example)) - Number(Boolean(b.entry.example)))
    .slice(0, 6);

  return (
    <div className="container-page max-w-3xl space-y-3 py-8">
      <section className="card px-6 py-8 sm:px-10">
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Find Puerto Rico nonprofits worth funding</h1>
        <p className="mt-3 text-muted">
          Search, or answer 4 quick questions. Save the ones you like to a shortlist you can share.
        </p>
        <form action="/organizations" className="mt-6 flex gap-2">
          <input
            name="q"
            aria-label="Search nonprofits"
            placeholder="Organization, issue or town"
            className="field !rounded-full !px-4 !py-2.5 !text-base"
          />
          <button className="btn-ghost shrink-0 !px-5">Search</button>
        </form>
        <div className="mt-4 flex items-center gap-3">
          <Link href="/find" className="btn-primary !px-6 !py-2.5 !text-base">
            Answer 4 quick questions
          </Link>
          <span className="text-sm text-muted">No account needed</span>
        </div>
      </section>

      {seeking.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="px-5 pt-4 text-base font-semibold">Seeking funding now</h2>
          <ul className="mt-1 divide-y divide-line">
            {seeking.map((opp) => {
              const e = opp.entry;
              return (
                <li key={opp.key} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={e.name} cause={e.cause} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link href={e.href} className="font-semibold text-brand hover:underline">
                      {opp.title}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {e.name} · {[e.city, placeName(e.state)].filter(Boolean).join(", ")} ·{" "}
                      {opp.amount != null ? money(opp.amount) : "Amount not posted"} · {fundingTypeLabel(opp.type)}
                    </p>
                  </div>
                  {isExample(opp) && <ExamplePill title={e.example ? undefined : ADDED_BY_JUSTCAUSE} />}
                  <SaveButton entryKey={`${e.kind}-${e.id}`} compact />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-center text-sm text-muted">
        Run a nonprofit?{" "}
        <Link href="/apply" className="font-semibold text-brand hover:underline">
          Post your impact opportunities
        </Link>
      </p>
    </div>
  );
}
