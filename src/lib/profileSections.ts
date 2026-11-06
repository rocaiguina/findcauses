// The parts of a nonprofit's profile, each saved on its own. Keys must match SECTIONS in
// backend/directory/profile_form.py.

export const PROFILE_SECTIONS = [
  { key: "basics", title: "Basics", blurb: "Your name, one-line summary, website and where you work." },
  { key: "mission", title: "Mission & causes", blurb: "What you do, the causes you work on and your key numbers." },
  { key: "track-record", title: "Track record & plans", blurb: "What you've delivered, who you work with and where you're headed." },
  { key: "opportunities", title: "Impact opportunities", blurb: "What you're raising money for right now." },
  { key: "financials", title: "Financials & 990", blurb: "Figures from your most recent Form 990, and the filing itself." },
  { key: "governance", title: "Board & stewardship", blurb: "Who governs the organization and how you account for gifts." },
  { key: "contact", title: "Contact", blurb: "Who funders should reach out to." },
] as const;

export type ProfileSectionKey = (typeof PROFILE_SECTIONS)[number]["key"];
