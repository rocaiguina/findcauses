"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAUSES } from "@/lib/causes";
import {
  GIFT_BANDS,
  MAX_CAUSES,
  MUST_HAVES,
  PLACES,
  SIZES,
  toQuery,
  type Criteria,
  type MustHave,
} from "@/lib/criteria";
import { FUNDING_TYPES, type FundingType } from "@/lib/funding";

const STEPS = 5;

function Pill({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
        on ? "border-success bg-success text-white" : "border-[#666] bg-card text-muted hover:bg-black/5 hover:text-ink"
      }`}
    >
      {on && <span aria-hidden>✓</span>}
      {children}
    </button>
  );
}

function Choice({ on, onClick, title, help }: { on: boolean; onClick: () => void; title: string; help?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left transition-colors hover:bg-black/[0.03] ${
        on ? "border-success shadow-[inset_0_0_0_1px_var(--color-success)]" : "border-line"
      }`}
    >
      <span className="block font-semibold">{title}</span>
      {help && <span className="mt-0.5 block text-sm text-muted">{help}</span>}
    </button>
  );
}

export function Finder({ initial }: { initial: Criteria }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [c, setC] = useState<Criteria>(initial);
  const [going, setGoing] = useState(false);

  const set = (patch: Partial<Criteria>) => setC((prev) => ({ ...prev, ...patch }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const finish = (final: Criteria) => {
    setGoing(true);
    router.push(`/opportunities?${toQuery(final)}`);
  };
  const next = () => setStep((s) => Math.min(STEPS, s + 1));

  const canNext = step === 1 ? c.causes.length > 0 : step === 2 ? c.gift != null : true;

  return (
    <div className="card overflow-hidden">
      <div className="h-1 bg-line">
        <div className="h-full bg-success transition-all" style={{ width: `${(step / STEPS) * 100}%` }} />
      </div>
      <div className="px-5 py-6 sm:px-8">
        <p className="text-xs font-semibold text-muted">
          Question {step} of {STEPS}
        </p>

        {step === 1 && (
          <section>
            <h1 className="mt-1 text-2xl font-semibold">What do you want to fund?</h1>
            <p className="mt-1 text-sm text-muted">Pick up to {MAX_CAUSES}.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CAUSES.filter((x) => x.slug !== "other").map((x) => {
                const on = c.causes.includes(x.slug);
                return (
                  <Pill
                    key={x.slug}
                    on={on}
                    disabled={!on && c.causes.length >= MAX_CAUSES}
                    onClick={() => set({ causes: toggle(c.causes, x.slug) })}
                  >
                    {x.label}
                  </Pill>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Where:</span>
              {PLACES.map((p) => (
                <Pill key={p.id} on={c.place === p.id} onClick={() => set({ place: p.id })}>
                  {p.label}
                </Pill>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="mt-1 text-2xl font-semibold">About how much would you give?</h1>
            <p className="mt-1 text-sm text-muted">Per organization. We use it to find opportunities your gift can move.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {GIFT_BANDS.map((g) => (
                <Choice
                  key={g.id}
                  on={c.gift === g.id}
                  title={g.label}
                  onClick={() => {
                    set({ gift: g.id });
                    next();
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="mt-1 text-2xl font-semibold">What kind of funding?</h1>
            <p className="mt-1 text-sm text-muted">Choose any that apply, or skip if you&apos;re flexible.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {FUNDING_TYPES.map((t) => (
                <Pill
                  key={t.id}
                  on={c.types.includes(t.id)}
                  onClick={() => set({ types: toggle<FundingType>(c.types, t.id) })}
                >
                  {t.label}
                </Pill>
              ))}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="mt-1 text-2xl font-semibold">What size of organization?</h1>
            <p className="mt-1 text-sm text-muted">By annual budget on the latest IRS Form 990.</p>
            <div className="mt-4 grid gap-2">
              {SIZES.map((s) => (
                <Choice
                  key={s.id}
                  on={c.size === s.id}
                  title={s.label}
                  help={s.help}
                  onClick={() => {
                    set({ size: s.id });
                    next();
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 className="mt-1 text-2xl font-semibold">Any must-haves?</h1>
            <p className="mt-1 text-sm text-muted">Opportunities that miss one go to the bottom. Skip if none.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {MUST_HAVES.map((m) => (
                <Pill key={m.id} on={c.must.includes(m.id)} onClick={() => set({ must: toggle<MustHave>(c.must, m.id) })}>
                  {m.label}
                </Pill>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 sm:px-8">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className={`text-sm font-semibold text-muted hover:text-ink ${step === 1 ? "invisible" : ""}`}
        >
          ← Back
        </button>
        {step < STEPS ? (
          <button type="button" disabled={!canNext} onClick={next} className="btn-primary disabled:opacity-40">
            {step === 3 && !c.types.length ? "Skip" : "Next"}
          </button>
        ) : (
          <button type="button" disabled={going} onClick={() => finish(c)} className="btn-primary disabled:opacity-60">
            {going ? "Building your shortlist…" : "Show my shortlist"}
          </button>
        )}
      </div>
    </div>
  );
}
