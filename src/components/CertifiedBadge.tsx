import { CERTIFIED_STEPS } from "@/lib/certified";
import type { CertifiedCheck } from "@/lib/types";
import { LogoMark } from "./Logo";

/** Shown on a certified organization's page, next to its name. */
export function CertifiedPill() {
  return (
    <span
      title="FindCauses Certified: claimed by the organization, complete profile and a recent Form 990"
      className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand"
    >
      <LogoMark size={14} />
      Certified
    </span>
  );
}

/** The three requirements, checked off. */
export function CertifiedChecklist({ check }: { check: CertifiedCheck }) {
  return (
    <ul className="space-y-2 text-sm">
      {CERTIFIED_STEPS.map((s) => (
        <li key={s.key} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] ${check[s.key] ? "bg-brand text-white" : "border border-line"}`}
          >
            {check[s.key] ? "✓" : ""}
          </span>
          <span>
            <span className={check[s.key] ? "font-medium" : ""}>{s.label}</span>
            <span className="block text-xs text-muted">{s.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
