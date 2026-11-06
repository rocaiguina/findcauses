"use client";

import { createContext, useContext, useState } from "react";
import { CAUSES } from "@/lib/causes";
import { US_STATES } from "@/lib/config";
import { FUNDING_TYPES } from "@/lib/funding";
import type { ProfileForm } from "@/lib/types";

// The fields of a nonprofit's profile, shared by the application form and the section-by-section editor.

export type Row = Record<string, string>;
export type ListSpec = {
  key: string;
  fields: {
    key: string;
    label: string;
    placeholder?: string;
    wide?: boolean;
    options?: readonly { id: string; label: string }[];
    numeric?: boolean;
  }[];
  min: number;
};

export const LISTS: Record<string, ListSpec> = {
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
  fundingNeeds: {
    key: "fundingNeeds",
    min: 1,
    fields: [
      { key: "title", label: "Opportunity", placeholder: "e.g. Expand tutoring to 3 new schools" },
      { key: "type", label: "Type of funding", options: FUNDING_TYPES },
      { key: "amount", label: "Amount sought (USD)", placeholder: "250000", numeric: true },
      { key: "timeframe", label: "Timeframe", placeholder: "2026–2027" },
      { key: "description", label: "What the money will do", wide: true },
    ],
  },
};

/** Saved values when editing an existing profile (or IRS data to start from), keyed by field name. */
export const Initial = createContext<Record<string, string>>({});

const blankRows = (spec: ListSpec) =>
  Array.from({ length: spec.min }, () => Object.fromEntries(spec.fields.map((f) => [f.key, ""])) as Row);

export function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-red-700">{msg}</p> : null;
}

export function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-baseline gap-3">
        <span className="text-lg text-accent">{String(n).padStart(2, "0")}</span>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

export function Field({
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
  const initial = useContext(Initial)[name];
  return (
    <div className={className}>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          required
          rows={4}
          className="field"
          placeholder={input.placeholder}
          defaultValue={initial}
        />
      ) : (
        <input id={name} name={name} required className="field" defaultValue={initial} {...input} />
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <Err msg={errors[name]} />
    </div>
  );
}

export function YesNo({ name, label, errors }: { name: string; label: string; errors: Record<string, string> }) {
  const initial = useContext(Initial)[name];
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="flex gap-4 text-sm">
        {["yes", "no"].map((v) => (
          <label key={v} className="flex items-center gap-2 capitalize">
            <input type="radio" name={name} value={v} required defaultChecked={initial === v} /> {v}
          </label>
        ))}
      </div>
      <Err msg={errors[name]} />
    </fieldset>
  );
}

export function ListEditor({
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
              {f.options ? (
                <select
                  className="field"
                  required
                  value={row[f.key]}
                  onChange={(e) => update(i, f.key, e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {f.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="field"
                  required
                  inputMode={f.numeric ? "numeric" : undefined}
                  placeholder={f.placeholder}
                  value={row[f.key]}
                  onChange={(e) => update(i, f.key, e.target.value)}
                />
              )}
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
        className="text-sm font-medium text-link"
      >
        + {addLabel}
      </button>
      <p className="text-xs text-muted">Minimum {spec.min}.</p>
      <Err msg={error} />
    </div>
  );
}

/** Saved list rows, topped up with blank ones to each list's minimum. */
export function useProfileLists(profile?: ProfileForm) {
  const [lists, setLists] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(
      Object.values(LISTS).map((s) => {
        const saved = profile?.lists[s.key] ?? [];
        return [
          s.key,
          saved.length >= s.min ? saved : [...saved, ...blankRows(s)].slice(0, Math.max(s.min, saved.length)),
        ];
      }),
    ),
  );
  const setList = (key: string) => (rows: Row[]) => setLists((l) => ({ ...l, [key]: rows }));
  return { lists, setList };
}

export function ErrorSummary({ errors, action }: { errors: Record<string, string>; action: string }) {
  const count = Object.keys(errors).length;
  if (!count) return null;
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <p className="font-semibold">
        Please fix {count} {count === 1 ? "issue" : "issues"} before {action}:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {Object.entries(errors).map(([k, v]) => (
          <li key={k}>{v}</li>
        ))}
      </ul>
    </div>
  );
}

export function OrganizationFields({ errors, lockedEin }: { errors: Record<string, string>; lockedEin?: boolean }) {
  const initial = useContext(Initial);
  return (
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
    <Field
      name="ein"
      label="EIN"
      placeholder="12-3456789"
      pattern="\d{2}-\d{7}"
      readOnly={Boolean(lockedEin)}
      hint={lockedEin ? "From IRS records." : undefined}
      errors={errors}
    />
    <Field name="website" label="Website" type="url" placeholder="https://" errors={errors} />
    <Field name="city" label="City" errors={errors} />
    <div>
      <label htmlFor="state" className="field-label">
        State / territory
      </label>
      <select id="state" name="state" required className="field" defaultValue={initial.state ?? ""}>
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
  );
}

export function CauseFields({ errors }: { errors: Record<string, string> }) {
  const initial = useContext(Initial);
  return (
    <>
  <div>
    <label htmlFor="cause" className="field-label">
      Primary cause
    </label>
    <select id="cause" name="cause" required className="field" defaultValue={initial.cause ?? ""}>
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
  <fieldset>
    <legend className="field-label">Other causes (optional)</legend>
    <p className="mt-1 text-xs text-muted">Any other areas you work on. Funders will also find you under these.</p>
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
      {CAUSES.map((c) => (
        <label key={c.slug} className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="otherCauses"
            value={c.slug}
            defaultChecked={(initial.otherCauses ?? "").split(",").includes(c.slug)}
          />
          {c.label}
        </label>
      ))}
    </div>
    <Err msg={errors.otherCauses} />
  </fieldset>
  <Field
    name="focusAreas"
    label="Focus areas / topics"
    placeholder="Voting rights, Legal advocacy, Youth civic education"
    hint="Comma-separated, up to 6."
    errors={errors}
  />
  <Field name="mission" label="Mission statement" textarea errors={errors} />
    </>
  );
}

export function FinancialFields({
  errors,
  optionalUpload,
  hasForm990,
}: {
  errors: Record<string, string>;
  optionalUpload?: boolean;
  hasForm990?: boolean;
}) {
  return (
    <>
  <div className="grid gap-5 sm:grid-cols-3">
    <Field name="fiscalYear" label="Fiscal year (tax year)" placeholder="2025" errors={errors} />
    <Field name="employees" label="Employees (Part I, line 5)" inputMode="numeric" errors={errors} />
    <Field name="volunteers" label="Volunteers (Part I, line 6)" inputMode="numeric" errors={errors} />
    <Field
      name="totalRevenue"
      label="Total revenue (Part I, line 12)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
    <Field
      name="contributions"
      label="Contributions & grants (line 8)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
    <Field
      name="programRevenue"
      label="Program service revenue (line 9)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
    <Field
      name="totalExpenses"
      label="Total expenses (Part I, line 18)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
    <Field
      name="programExpenses"
      label="Program services (Part IX, 25B)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
    <Field
      name="managementExpenses"
      label="Management & general (25C)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
    <Field
      name="fundraisingExpenses"
      label="Fundraising (25D)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
    <Field
      name="totalAssets"
      label="Total assets (line 20, EOY)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
    <Field
      name="netAssets"
      label="Net assets (line 22, EOY)"
      inputMode="numeric"
      placeholder="$"
      errors={errors}
    />
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
      required={!optionalUpload}
      className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-black/[0.05] file:px-4 file:py-2 file:font-semibold file:text-ink"
    />
    <p className="mt-1 text-xs text-muted">
      The complete filed return, including schedules.
      {optionalUpload &&
        (hasForm990
          ? " A 990 is on file; upload a newer one to replace it."
          : " Optional if IRS data already has your 990 from the last 3 tax years.")}
    </p>
    <Err msg={errors.form990} />
  </div>
    </>
  );
}

export function StewardshipFields({ errors }: { errors: Record<string, string> }) {
  return (
    <>
  <div className="grid gap-5 sm:grid-cols-2">
    <YesNo name="independentAudit" label="Are your financials independently audited?" errors={errors} />
    <Field name="auditor" label="Audit firm (or why you are not audited)" errors={errors} />
    <YesNo
      name="conflictOfInterestPolicy"
      label="Written conflict of interest policy? (990 Part VI, 12a)"
      errors={errors}
    />
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
    </>
  );
}

export function ContactFields({ errors }: { errors: Record<string, string> }) {
  return (
  <div className="grid gap-5 sm:grid-cols-2">
    <Field name="contactName" label="Contact name" errors={errors} />
    <Field name="contactTitle" label="Title" errors={errors} />
    <Field name="contactEmail" label="Email" type="email" errors={errors} />
    <Field name="contactPhone" label="Phone" type="tel" errors={errors} />
  </div>
  );
}

export function CertifyField({ errors }: { errors: Record<string, string> }) {
  const initial = useContext(Initial);
  return (
    <>
  <label className="flex items-start gap-3 text-sm">
    <input type="checkbox" name="certify" required defaultChecked={initial.certify === "on"} className="mt-1" />
    <span>
      I am authorized to submit this information on behalf of the organization, and I certify that it is
      accurate and consistent with our most recent IRS Form 990.
    </span>
  </label>
  <Err msg={errors.certify} />
    </>
  );
}
