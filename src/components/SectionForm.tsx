"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/client";
import { PROFILE_SECTIONS, type ProfileSectionKey } from "@/lib/profileSections";
import type { ProfileForm } from "@/lib/types";
import {
  CauseFields,
  CertifyField,
  ContactFields,
  ErrorSummary,
  FinancialFields,
  Initial,
  LISTS,
  ListEditor,
  OrganizationFields,
  StewardshipFields,
  useProfileLists,
  type Row,
} from "./profileFields";

// Which repeatable lists each section holds, in order, with their headings.
const SECTION_LISTS: Partial<Record<ProfileSectionKey, { key: string; title: string; hint?: string; add: string }[]>> = {
  mission: [{ key: "impactMetrics", title: "Key impact metrics", add: "Add metric" }],
  "track-record": [
    { key: "trackRecord", title: "Track record", hint: "Milestones and results that show what you've delivered.", add: "Add milestone" },
    { key: "networks", title: "Networks", hint: "Coalitions, partner organizations, public agencies and institutional funders.", add: "Add network or partner" },
    { key: "roadmap", title: "Roadmap", hint: "Where you're headed in the next one to three years, and what it will take.", add: "Add goal" },
  ],
  opportunities: [
    {
      key: "fundingNeeds",
      title: "What you're raising money for",
      hint: "Funders see these like job postings: each one can land on a funder's shortlist, matched by cause, size, gift amount and type of funding.",
      add: "Add impact opportunity",
    },
  ],
  governance: [{ key: "board", title: "Board of directors", hint: "List all current voting board members.", add: "Add board member" }],
};

/** One section of a profile: its own fields and its own save. */
export function SectionForm({ form, section }: { form: ProfileForm; section: ProfileSectionKey }) {
  const router = useRouter();
  const { lists, setList } = useProfileLists(form);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const slug = form.organization.slug;
  const base = `/dashboard/${slug}`;
  const live = form.profileStatus === "published";
  const locked = form.profileStatus === "pending" || form.profileStatus === "rejected";
  const listSpecs = SECTION_LISTS[section] ?? [];
  const lastOne = !live && PROFILE_SECTIONS.every((s) => s.key === section || form.sections[s.key]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    for (const { key } of listSpecs) fd.set(key, JSON.stringify(lists[key] as Row[]));
    try {
      const res = await apiPost<{ publishedNow?: boolean; errors?: Record<string, string>; error?: string }>(
        `me/organizations/${slug}/profile/${section}`,
        fd,
      );
      if (res.ok) {
        if (res.data.publishedNow) {
          router.push(`${base}?published=1`);
        } else if (live) {
          setSaved(true);
        } else {
          // On to the next section still to do, or the overview once this was the last one in order.
          const order = PROFILE_SECTIONS.map((s) => s.key);
          const later = [...order.slice(order.indexOf(section) + 1), ...order.slice(0, order.indexOf(section))];
          const next = later.find((k) => !form.sections[k]);
          router.push(next ? `${base}/${next}` : base);
        }
        router.refresh();
        setSubmitting(false);
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
    <Initial.Provider value={form.values}>
      <form onSubmit={onSubmit} onChange={() => setSaved(false)} className="space-y-6">
        <ErrorSummary errors={errors} action="saving" />

        {section === "basics" && (
          <div className="card p-6 sm:p-8">
            <OrganizationFields errors={errors} lockedEin={Boolean(form.organization.ein)} />
          </div>
        )}
        {section === "mission" && (
          <div className="card space-y-5 p-6 sm:p-8">
            <CauseFields errors={errors} />
          </div>
        )}
        {section === "financials" && (
          <div className="card space-y-5 p-6 sm:p-8">
            <p className="text-sm text-muted">
              Copy the figures exactly from your most recent filed 990. Our team checks them against the PDF you upload.
            </p>
            <FinancialFields errors={errors} optionalUpload hasForm990={form.hasForm990} />
          </div>
        )}

        {listSpecs.map((l) => (
          <section key={l.key} className="card p-6 sm:p-8">
            <h2 className="section-title">{l.title}</h2>
            {l.hint && <p className="mt-1 text-sm text-muted">{l.hint}</p>}
            <div className="mt-5">
              <ListEditor
                spec={LISTS[l.key]}
                rows={lists[l.key]}
                setRows={(rows) => {
                  setSaved(false);
                  setList(l.key)(rows);
                }}
                addLabel={l.add}
                error={errors[l.key]}
              />
            </div>
          </section>
        ))}

        {section === "governance" && (
          <section className="card space-y-5 p-6 sm:p-8">
            <h2 className="section-title">Stewardship</h2>
            <StewardshipFields errors={errors} />
          </section>
        )}
        {section === "contact" && (
          <div className="card space-y-5 p-6 sm:p-8">
            <ContactFields errors={errors} />
            {!live && <CertifyField errors={errors} />}
          </div>
        )}

        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 px-1 py-4 backdrop-blur">
          <p className="text-sm text-muted" role="status">
            {saved ? (
              <span className="font-medium text-brand-dark">✓ Saved. It&apos;s live on your page now.</span>
            ) : live ? (
              "Changes go live as soon as you save."
            ) : lastOne ? (
              "This is the last section: saving it publishes your profile."
            ) : (
              "Private until your whole profile is complete."
            )}
          </p>
          <div className="flex items-center gap-4">
            <Link href={base} className="text-sm text-muted hover:underline underline-offset-4">
              Back to overview
            </Link>
            <button type="submit" disabled={submitting || locked} className="btn-primary disabled:opacity-60">
              {submitting ? "Saving…" : live ? "Save changes" : lastOne ? "Save and publish" : "Save and continue"}
            </button>
          </div>
        </div>
      </form>
    </Initial.Provider>
  );
}
