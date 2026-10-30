"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAUSES } from "@/lib/causes";
import { US_STATES } from "@/lib/config";

type Row = Record<string, string>;
type ListSpec = { key: string; fields: { key: string; label: string; placeholder?: string; wide?: boolean }[]; min: number };

const LISTS: Record<string, ListSpec> = {
  impactMetrics: {
    key: "impactMetrics",
    min: 2,
    fields: [
      { key: "value", label: "Figure", placeholder: "e.g. 12,000" },
      { key: "label", label: "What it measures", placeholder: "e.g. Students served in 2025", wide: true },
    ],
  },
  trackRecord: {
    key: "trackRecord",
    min: 2,
    fields: [
      { key: "year", label: "Year", placeholder: "2021" },
      { key: "title", label: "Milestone", placeholder: "Launched statewide program" },
      { key: "description", label: "Result", placeholder: "What changed, with numbers if possible", wide: true },
    ],
  },
  networks: {
    key: "networks",
    min: 1,
    fields: [
      { key: "name", label: "Network or partner", placeholder: "Statewide coalition name" },
      { key: "type", label: "Type", placeholder: "Coalition, funder, public agency…" },
      { key: "description", label: "Your role in it", wide: true },
    ],
  },
  roadmap: {
    key: "roadmap",
    min: 2,
    fields: [
      { key: "timeframe", label: "Timeframe", placeholder: "2026 or 2027–2028" },
      { key: "goal", label: "Goal", placeholder: "Expand to 3 new counties" },
      { key: "description", label: "What it takes", placeholder: "Plan and resources needed", wide: true },
    ],
  },
  board: {
    key: "board",
    min: 3,
    fields: [
      { key: "name", label: "Full name" },
      { key: "role", label: "Board role", placeholder: "Chair, Treasurer, Director…" },
      { key: "affiliation", label: "Professional affiliation", wide: true },
    ],
  },
};

const blankRows = (spec: ListSpec) =>
  Array.from({ length: spec.min }, () => Object.fromEntries(spec.fields.map((f) => [f.key, ""])) as Row);

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-700">{msg}</p> : null;
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-lg text-accent">{String(n).padStart(2, "0")}</span>
        <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      </div>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  name,
  label,
  errors,
  hint,
  textarea,
  className = "",
  ...input
}: {
  name: string;
  label: string;
  errors: Record<string, string>;
  hint?: string;
  textarea?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      {textarea ? (
        <textarea id={name} name={name} required rows={4} className="field" placeholder={input.placeholder} />
      ) : (
        <input id={name} name={name} required className="field" {...input} />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <Err msg={errors[name]} />
    </div>
  );
}

function YesNo({ name, label, errors }: { name: string; label: string; errors: Record<string, string> }) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex gap-4 text-sm">
        {["yes", "no"].map((v) => (
          <label key={v} className="flex items-center gap-2 capitalize">
            <input type="radio" name={name} value={v} required /> {v}
          </label>
        ))}
      </div>
      <Err msg={errors[name]} />
    </fieldset>
  );
}

function ListEditor({
  spec,
  rows,
  setRows,
  addLabel,
  error,
}: {
  spec: ListSpec;
  rows: Row[];
  setRows: (r: Row[]) => void;
  addLabel: string;
  error?: string;
}) {
  const update = (i: number, key: string, value: string) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-[1fr_1fr_auto]">
          {spec.fields.map((f) => (
            <div key={f.key} className={f.wide ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-xs font-medium text-muted">{f.label}</label>
              <input
                className="field"
                required
                placeholder={f.placeholder}
                value={row[f.key]}
                onChange={(e) => update(i, f.key, e.target.value)}
              />
            </div>
          ))}
          <button
            type="button"
            disabled={rows.length <= spec.min}
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
            className="self-end rounded-lg px-3 py-2 text-sm text-muted hover:text-red-700 disabled:invisible sm:row-start-1 sm:col-start-3"
            aria-label="Remove row"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, blankRows({ ...spec, min: 1 })[0]])}
        className="text-sm font-semibold text-brand hover:underline"
      >
        + {addLabel}
      </button>
      <p className="text-xs text-muted">Minimum {spec.min}.</p>
      <Err msg={error} />
    </div>
  );
}

export function ApplicationForm() {
  const router = useRouter();
  const [lists, setLists] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(Object.values(LISTS).map((s) => [s.key, blankRows(s)])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const setList = (key: string) => (rows: Row[]) => setLists((l) => ({ ...l, [key]: rows }));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    for (const [key, rows] of Object.entries(lists)) fd.set(key, JSON.stringify(rows));
    try {
      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const body = await res.json();
      if (res.ok) {
        router.push(`/apply/submitted?name=${encodeURIComponent(String(fd.get("name")))}`);
        return;
      }
      setErrors(body.errors ?? { form: "Something went wrong. Please try again." });
    } catch {
      setErrors({ form: "Network error. Please try again." });
    }
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate={false}>
      {errorCount > 0 && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-semibold">
            Please fix {errorCount} {errorCount === 1 ? "issue" : "issues"} before submitting:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      <Step n={1} title="Organization" hint="Basic identity, as it appears on your IRS filings.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label="Legal name" errors={errors} className="sm:col-span-2" />
          <Field
            name="tagline"
            label="One-line summary"
            maxLength={160}
            placeholder="What you do, in one sentence a funder will remember"
            errors={errors}
            className="sm:col-span-2"
          />
          <Field name="ein" label="EIN" placeholder="12-3456789" pattern="\d{2}-\d{7}" errors={errors} />
          <Field name="website" label="Website" type="url" placeholder="https://" errors={errors} />
          <Field name="city" label="City" errors={errors} />
          <div>
            <label htmlFor="state" className="field-label">
              State / territory
            </label>
            <select id="state" name="state" required className="field" defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              {US_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <Err msg={errors.state} />
          </div>
          <Field name="yearFounded" label="Year founded" type="number" min={1800} errors={errors} />
          <Field
            name="geographicScope"
            label="Geographic scope"
            placeholder="e.g. Regional — Southeast US"
            errors={errors}
          />
        </div>
      </Step>

      <Step n={2} title="Mission & focus" hint="How funders will find you in the directory.">
        <div>
          <label htmlFor="cause" className="field-label">
            Primary cause
          </label>
          <select id="cause" name="cause" required className="field" defaultValue="">
            <option value="" disabled>
              Select the cause that best fits your work…
            </option>
            {CAUSES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <Err msg={errors.cause} />
        </div>
        <Field
          name="focusAreas"
          label="Focus areas / topics"
          placeholder="Voting rights, Legal advocacy, Youth civic education"
          hint="Comma-separated, up to 6."
          errors={errors}
        />
        <Field name="mission" label="Mission statement" textarea errors={errors} />
        <div>
          <p className="field-label">Key impact metrics</p>
          <ListEditor
            spec={LISTS.impactMetrics}
            rows={lists.impactMetrics}
            setRows={setList("impactMetrics")}
            addLabel="Add metric"
            error={errors.impactMetrics}
          />
        </div>
      </Step>

      <Step n={3} title="Track record" hint="Milestones and results that show what you've delivered.">
        <ListEditor
          spec={LISTS.trackRecord}
          rows={lists.trackRecord}
          setRows={setList("trackRecord")}
          addLabel="Add milestone"
          error={errors.trackRecord}
        />
      </Step>

      <Step n={4} title="Networks" hint="Coalitions, partner organizations, public agencies and institutional funders.">
        <ListEditor
          spec={LISTS.networks}
          rows={lists.networks}
          setRows={setList("networks")}
          addLabel="Add network or partner"
          error={errors.networks}
        />
      </Step>

      <Step n={5} title="Roadmap" hint="Where you're headed in the next one to three years, and what it will take.">
        <ListEditor
          spec={LISTS.roadmap}
          rows={lists.roadmap}
          setRows={setList("roadmap")}
          addLabel="Add goal"
          error={errors.roadmap}
        />
      </Step>

      <Step
        n={6}
        title="Financials from your Form 990"
        hint="Copy the figures exactly from your most recent filed 990. We verify them against the uploaded PDF. JustCause lists organizations with $1M–$50M in total expenses."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Field name="fiscalYear" label="Fiscal year (tax year)" placeholder="2025" errors={errors} />
          <Field name="employees" label="Employees (Part I, line 5)" inputMode="numeric" errors={errors} />
          <Field name="volunteers" label="Volunteers (Part I, line 6)" inputMode="numeric" errors={errors} />
          <Field name="totalRevenue" label="Total revenue (Part I, line 12)" inputMode="numeric" placeholder="$" errors={errors} />
          <Field name="contributions" label="Contributions & grants (line 8)" inputMode="numeric" placeholder="$" errors={errors} />
          <Field name="programRevenue" label="Program service revenue (line 9)" inputMode="numeric" placeholder="$" errors={errors} />
          <Field name="totalExpenses" label="Total expenses (Part I, line 18)" inputMode="numeric" placeholder="$" errors={errors} />
          <Field name="programExpenses" label="Program services (Part IX, 25B)" inputMode="numeric" placeholder="$" errors={errors} />
          <Field name="managementExpenses" label="Management & general (25C)" inputMode="numeric" placeholder="$" errors={errors} />
          <Field name="fundraisingExpenses" label="Fundraising (25D)" inputMode="numeric" placeholder="$" errors={errors} />
          <Field name="totalAssets" label="Total assets (line 20, EOY)" inputMode="numeric" placeholder="$" errors={errors} />
          <Field name="netAssets" label="Net assets (line 22, EOY)" inputMode="numeric" placeholder="$" errors={errors} />
        </div>
        <div>
          <label htmlFor="form990" className="field-label">
            Upload Form 990 (PDF, max 20 MB)
          </label>
          <input
            id="form990"
            name="form990"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand"
          />
          <p className="mt-1 text-xs text-muted">The complete filed return, including schedules.</p>
          <Err msg={errors.form990} />
        </div>
      </Step>

      <Step n={7} title="Board of directors" hint="List all current voting board members.">
        <ListEditor
          spec={LISTS.board}
          rows={lists.board}
          setRows={setList("board")}
          addLabel="Add board member"
          error={errors.board}
        />
      </Step>

      <Step n={8} title="Stewardship" hint="How you govern, account for and report on the money you receive.">
        <div className="grid gap-5 sm:grid-cols-2">
          <YesNo name="independentAudit" label="Are your financials independently audited?" errors={errors} />
          <Field
            name="auditor"
            label="Audit firm (or why you are not audited)"
            errors={errors}
          />
          <YesNo name="conflictOfInterestPolicy" label="Written conflict of interest policy? (990 Part VI, 12a)" errors={errors} />
          <YesNo name="whistleblowerPolicy" label="Written whistleblower policy? (Part VI, 13)" errors={errors} />
          <YesNo name="documentRetentionPolicy" label="Document retention policy? (Part VI, 14)" errors={errors} />
        </div>
        <Field
          name="funderReporting"
          label="How do you report to funders?"
          textarea
          placeholder="Frequency, format, what's included (financial and narrative), site visits…"
          errors={errors}
        />
        <Field
          name="impactMeasurement"
          label="How do you measure impact?"
          textarea
          placeholder="Indicators tracked, baselines, evaluation partners…"
          errors={errors}
        />
        <Field
          name="restrictedFunds"
          label="How do you manage restricted gifts?"
          textarea
          placeholder="How designated funds are tracked, spent and reported…"
          errors={errors}
        />
      </Step>

      <Step n={9} title="Contact & certification">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="contactName" label="Contact name" errors={errors} />
          <Field name="contactTitle" label="Title" errors={errors} />
          <Field name="contactEmail" label="Email" type="email" errors={errors} />
          <Field name="contactPhone" label="Phone" type="tel" errors={errors} />
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="certify" required className="mt-1" />
          <span>
            I am authorized to submit this information on behalf of the organization, and I certify that it is
            accurate and consistent with our most recent IRS Form 990.
          </span>
        </label>
        <Err msg={errors.certify} />
      </Step>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Profiles go live after our team verifies them, usually within 5 business days.</p>
        <button type="submit" disabled={submitting} className="btn-primary !px-8 !py-3 disabled:opacity-60">
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}
