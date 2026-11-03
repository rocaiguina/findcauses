import type { CertifiedCheck } from "./types";

// "FindCauses Certified": the organization manages its own page, has published a complete profile, and has a
// recent Form 990 on record, either in IRS data or uploaded and checked by us. The backend checks all three
// live (directory/models.py), so the badge disappears on its own when a 990 goes stale.

/** Must match RECENT_990_YEARS in backend/directory/models.py. */
export const RECENT_990_YEARS = 3;

export const CERTIFIED_STEPS: { key: keyof CertifiedCheck; label: string; detail: string }[] = [
  {
    key: "claimed",
    label: "Claimed by the organization",
    detail: "Someone at the organization verified their email and manages this page.",
  },
  {
    key: "profile",
    label: "Complete profile",
    detail: "Mission, track record, board, roadmap, stewardship and funding needs, all filled in.",
  },
  {
    key: "recent990",
    label: "Recent Form 990",
    detail: `A Form 990 for one of the last ${RECENT_990_YEARS} tax years, from IRS data or uploaded and verified.`,
  },
];
