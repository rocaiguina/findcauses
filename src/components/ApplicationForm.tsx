"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/client";
import {
  CauseFields,
  CertifyField,
  ContactFields,
  ErrorSummary,
  Field,
  FinancialFields,
  Initial,
  LISTS,
  ListEditor,
  OrganizationFields,
  Step,
  StewardshipFields,
  useProfileLists,
} from "./profileFields";

/** The application of an organization that isn't in the directory yet. Our team reviews it before it goes live. */
export function ApplicationForm() {
  const router = useRouter();
  const { lists, setList } = useProfileLists();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    for (const [key, rows] of Object.entries(lists)) fd.set(key, JSON.stringify(rows));
    try {
      const res = await apiPost<{ slug?: string; errors?: Record<string, string>; error?: string }>("apply", fd);
      if (res.ok) {
        router.push(`/apply/submitted?name=${encodeURIComponent(String(fd.get("name")))}`);
        router.refresh();
        return;
      }
      setErrors(res.data.errors ?? { form: res.data.error ?? "Something went wrong. Please try again." });
    } catch {
      setErrors({ form: "Network error. Please try again." });
    }
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Initial.Provider value={{}}>
      <form onSubmit={onSubmit} className="space-y-6" noValidate={false}>
        <ErrorSummary errors={errors} action="submitting" />

        <Step n={1} title="Organization" hint="Basic identity, as it appears on your IRS filings.">
          <OrganizationFields errors={errors} />
          <Field
            name="irsRulingDate"
            label="When the IRS recognized your tax-exempt status"
            type="month"
            placeholder="2010-06"
            hint="The month on your IRS determination letter. FindCauses lists organizations recognized for at least 10 years."
            errors={errors}
          />
        </Step>

        <Step n={2} title="Mission & focus" hint="How funders will find you in the directory.">
          <CauseFields errors={errors} />
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

        <Step
          n={4}
          title="Networks"
          hint="Coalitions, partner organizations, public agencies and institutional funders."
        >
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
          title="Impact opportunities"
          hint="What you're raising money for right now. Funders see these like job postings: each one can land on a funder's shortlist of 6, matched by cause, size, gift amount and type of funding."
        >
          <ListEditor
            spec={LISTS.fundingNeeds}
            rows={lists.fundingNeeds}
            setRows={setList("fundingNeeds")}
            addLabel="Add impact opportunity"
            error={errors.fundingNeeds}
          />
        </Step>

        <Step
          n={7}
          title="Financials from your Form 990"
          hint="Copy the figures exactly from your most recent filed 990. We verify them against the uploaded PDF. FindCauses lists organizations with $1M–$20M in total expenses."
        >
          <FinancialFields errors={errors} />
        </Step>

        <Step n={8} title="Board of directors" hint="List all current voting board members.">
          <ListEditor
            spec={LISTS.board}
            rows={lists.board}
            setRows={setList("board")}
            addLabel="Add board member"
            error={errors.board}
          />
        </Step>

        <Step n={9} title="Stewardship" hint="How you govern, account for and report on the money you receive.">
          <StewardshipFields errors={errors} />
        </Step>

        <Step n={10} title="Contact & certification">
          <ContactFields errors={errors} />
          <CertifyField errors={errors} />
        </Step>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">Profiles go live after our team verifies them, usually within 5 business days.</p>
          <button type="submit" disabled={submitting} className="btn-primary !px-8 !py-3 disabled:opacity-60">
            {submitting ? "Saving…" : "Submit for review"}
          </button>
        </div>
      </form>
    </Initial.Provider>
  );
}
