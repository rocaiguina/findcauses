import Link from "next/link";
import { RibbonArtwork } from "@/components/Artwork";
import { SaveButton } from "@/components/Save";
import { MID_SIZE_MAX_BUDGET, MID_SIZE_MIN_BUDGET, MIN_IRS_YEARS } from "@/lib/config";
import { yearsSince } from "@/lib/format";
import { money, placeName } from "@/lib/format";
import { fundingTypeLabel } from "@/lib/funding";
import { opportunitiesFor } from "@/lib/match";
import { listDirectory } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listDirectory();
  // Posted opportunities from mid-size, established organizations.
  const seeking = entries
    .filter((e) => e.budget == null || (e.budget >= MID_SIZE_MIN_BUDGET && e.budget <= MID_SIZE_MAX_BUDGET))
    .filter((e) => !e.irsSince || yearsSince(e.irsSince) >= MIN_IRS_YEARS)
    .flatMap(opportunitiesFor)
    .filter((o) => !o.implied)
    .slice(0, 6);

  return (
    <div className="container-page py-10 sm:py-16">
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div>
          <h1 className="text-[34px] font-normal leading-[1.12] tracking-[-0.02em] sm:text-5xl">
            Find Puerto Rico nonprofits worth funding.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Search, or answer 4 quick questions. Save the ones you like to a shortlist you can share.
          </p>
          <form action="/organizations" className="mt-8 flex max-w-md gap-2">
            <input
              name="q"
              aria-label="Search nonprofits"
              placeholder="Organization, issue or town"
              className="field !rounded-full !px-4 !py-2.5 !text-base"
            />
            <button className="btn-ghost shrink-0">Search</button>
          </form>
          <div className="mt-4 flex items-center gap-4">
            <Link href="/find" className="btn-primary !px-6 !py-2.5 !text-base">
              Find matches
            </Link>
            <Link href="/opportunities" className="text-link text-[15px]">
              Browse opportunities
            </Link>
          </div>
        </div>
        <RibbonArtwork className="mx-auto aspect-[5/4] w-full max-w-[520px]" />
      </section>

      {seeking.length > 0 && (
        <section className="mx-auto mt-16 max-w-3xl sm:mt-24">
          <h2 className="text-2xl font-normal tracking-[-0.01em]">Seeking funding now</h2>
          <ul className="mt-5 border-t border-ink/80">
            {seeking.map((opp) => {
              const e = opp.entry;
              return (
                <li key={opp.key} className="flex items-start gap-3 border-b border-line py-4">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={e.href} className="text-[15px] font-medium hover:underline underline-offset-4">
                        {opp.title}
                      </Link>
                    </div>
                    <p className="text-sm text-muted">
                      {e.name} · {[e.city, placeName(e.state)].filter(Boolean).join(", ")} ·{" "}
                      {opp.amount != null ? money(opp.amount) : "Amount not posted"} · {fundingTypeLabel(opp.type)}
                    </p>
                  </div>
                  <SaveButton entryKey={`${e.kind}-${e.id}`} compact />
                </li>
              );
            })}
          </ul>
          <Link href="/opportunities" className="text-link mt-5 inline-block text-[15px]">
            See all impact opportunities
          </Link>
        </section>
      )}
    </div>
  );
}
