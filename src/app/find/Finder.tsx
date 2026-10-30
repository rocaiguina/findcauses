"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { APPROACHES, type Approach } from "@/lib/approach";
import { CAUSES } from "@/lib/causes";
import { GIFT_BANDS, MAX_CAUSES, MUST_HAVES, PLACES, toQuery, type Criteria, type MustHave } from "@/lib/criteria";

const STEPS = 4;

function Pill({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`${on ? "pill-on" : "pill"} !px-4 !py-2 disabled:opacity-40`}
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
        on ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line"
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
  const next = () => setStep((s) => Math.min(STEPS, s + 1));
  const finish = () => {
    setGoing(true);
    router.push(`/opportunities?${toQuery(c)}`);
  };

  const canNext = step === 1 ? c.causes.length > 0 : step === 3 ? c.gift != null : true;

  return (
    <div className="card overflow-hidden">
      <div className="h-1 bg-line">
        <div className="h-full bg-brand transition-all" style={{ width: `${(step / STEPS) * 100}%` }} />
      </div>
      <div className="px-5 py-6 sm:px-8">
        <p className="text-xs font-semibold text-muted">
          {step} of {STEPS}
        </p>

        {step === 1 && (
          <section>
            <h1 className="mt-1 text-2xl font-semibold">What do you fund?</h1>
            <p className="mt-1 text-sm text-muted">Up to {MAX_CAUSES}.</p>
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
            <h1 className="mt-1 text-2xl font-semibold">How do you want to drive change?</h1>
            <p className="mt-1 text-sm text-muted">Pick any, or skip.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {APPROACHES.map((a) => (
                <Choice
                  key={a.id}
                  on={c.approaches.includes(a.id)}
                  title={a.label}
                  help={a.help}
                  onClick={() => set({ approaches: toggle<Approach>(c.approaches, a.id) })}
                />
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="mt-1 text-2xl font-semibold">Typical grant size?</h1>
            <p className="mt-1 text-sm text-muted">Per organization.</p>
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

        {step === 4 && (
          <section>
            <h1 className="mt-1 text-2xl font-semibold">Any must-haves?</h1>
            <p className="mt-1 text-sm text-muted">Optional.</p>
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
            {step === 2 && !c.approaches.length ? "Skip" : "Next"}
          </button>
        ) : (
          <button type="button" disabled={going} onClick={finish} className="btn-primary disabled:opacity-60">
            {going ? "Finding…" : "Show matches"}
          </button>
        )}
      </div>
    </div>
  );
}
