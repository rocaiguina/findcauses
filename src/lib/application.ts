import "server-only";
import { isCauseSlug, type CauseSlug } from "./causes";
import { MAX_990_BYTES, MID_SIZE_MAX_BUDGET, MID_SIZE_MIN_BUDGET, US_STATES } from "./config";
import { moneyFull } from "./format";
import { FUNDING_TYPES, type FundingType } from "./funding";
import type { Financials, FundingNeed, Organization } from "./types";

export type ApplicationErrors = Record<string, string>;

type Parsed = Omit<Organization, "id" | "slug" | "status" | "submittedAt" | "reviewedAt" | "form990">;

const NUMBER_FIELDS = [
  "totalRevenue",
  "contributions",
  "programRevenue",
  "totalExpenses",
  "programExpenses",
  "managementExpenses",
  "fundraisingExpenses",
  "totalAssets",
  "netAssets",
  "employees",
  "volunteers",
] as const;

// Every list row must have each of its keys filled in.
const LISTS = {
  impactMetrics: { keys: ["label", "value"], min: 2, label: "impact metrics" },
  trackRecord: { keys: ["year", "title", "description"], min: 2, label: "track record milestones" },
  networks: { keys: ["name", "type", "description"], min: 1, label: "networks or partners" },
  roadmap: { keys: ["timeframe", "goal", "description"], min: 2, label: "roadmap goals" },
  board: { keys: ["name", "role", "affiliation"], min: 3, label: "board members" },
} as const;

export function parseApplication(fd: FormData): { data?: Parsed; file?: File; errors: ApplicationErrors } {
  const errors: ApplicationErrors = {};
  const str = (key: string, label: string, max = 2000) => {
    const v = String(fd.get(key) ?? "").trim();
    if (!v) errors[key] = `${label} is required.`;
    else if (v.length > max) errors[key] = `${label} must be under ${max} characters.`;
    return v;
  };
  const yesNo = (key: string, label: string) => {
    const v = fd.get(key);
    if (v !== "yes" && v !== "no") errors[key] = `Answer yes or no: ${label}.`;
    return v === "yes";
  };

  const name = str("name", "Organization name", 200);
  const tagline = str("tagline", "One-line summary", 160);
  const ein = str("ein", "EIN", 10);
  if (ein && !/^\d{2}-\d{7}$/.test(ein)) errors.ein = "EIN must look like 12-3456789.";
  const website = str("website", "Website", 300);
  if (website && !/^https?:\/\/\S+\.\S+/.test(website)) errors.website = "Website must start with http:// or https://.";
  const city = str("city", "City", 100);
  const state = str("state", "State", 2);
  if (state && !US_STATES.includes(state)) errors.state = "Choose a U.S. state or territory.";
  const yearFounded = Number(str("yearFounded", "Year founded", 4));
  if (yearFounded && (yearFounded < 1800 || yearFounded > new Date().getFullYear()))
    errors.yearFounded = "Enter a valid founding year.";
  const geographicScope = str("geographicScope", "Geographic scope", 200);

  const contact = {
    name: str("contactName", "Contact name", 120),
    title: str("contactTitle", "Contact title", 120),
    email: str("contactEmail", "Contact email", 200),
    phone: str("contactPhone", "Contact phone", 40),
  };
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.contactEmail = "Enter a valid email.";

  const cause = str("cause", "Primary cause", 40);
  if (cause && !isCauseSlug(cause)) errors.cause = "Choose one of the listed causes.";
  const focusAreas = str("focusAreas", "Focus areas", 300)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const mission = str("mission", "Mission statement", 1200);

  const fiscalYear = str("fiscalYear", "Fiscal year", 4);
  if (fiscalYear && !/^\d{4}$/.test(fiscalYear)) errors.fiscalYear = "Enter the 4-digit fiscal year.";
  const nums = {} as Record<(typeof NUMBER_FIELDS)[number], number>;
  for (const key of NUMBER_FIELDS) {
    const raw = String(fd.get(key) ?? "").replace(/[$,\s]/g, "");
    const n = Number(raw);
    if (!raw) errors[key] = "Required.";
    else if (!Number.isFinite(n) || (key !== "netAssets" && n < 0)) errors[key] = "Enter a valid amount.";
    nums[key] = Math.round(n);
  }
  const financials: Financials = { fiscalYear, ...nums };

  if (!errors.totalExpenses && (nums.totalExpenses < MID_SIZE_MIN_BUDGET || nums.totalExpenses > MID_SIZE_MAX_BUDGET))
    errors.totalExpenses = `JustCause lists mid-size nonprofits with total expenses between ${moneyFull(
      MID_SIZE_MIN_BUDGET,
    )} and ${moneyFull(MID_SIZE_MAX_BUDGET)}.`;
  const functional = nums.programExpenses + nums.managementExpenses + nums.fundraisingExpenses;
  if (!errors.programExpenses && Math.abs(functional - nums.totalExpenses) > nums.totalExpenses * 0.01)
    errors.programExpenses = "Program + management + fundraising should add up to total expenses (990 Part IX, line 25).";
  if (!errors.contributions && nums.contributions + nums.programRevenue > nums.totalRevenue)
    errors.contributions = "Contributions plus program revenue can't exceed total revenue.";

  const lists = {} as Record<keyof typeof LISTS, Record<string, string>[]>;
  for (const [key, spec] of Object.entries(LISTS) as [keyof typeof LISTS, (typeof LISTS)[keyof typeof LISTS]][]) {
    let rows: unknown;
    try {
      rows = JSON.parse(String(fd.get(key) ?? "[]"));
    } catch {
      rows = [];
    }
    const clean = (Array.isArray(rows) ? rows : [])
      .slice(0, 25)
      .map((r) => Object.fromEntries(spec.keys.map((k) => [k, String((r as Record<string, unknown>)?.[k] ?? "").trim().slice(0, 600)])));
    if (clean.length < spec.min) errors[key] = `Add at least ${spec.min} ${spec.label}.`;
    else if (clean.some((r) => spec.keys.some((k) => !r[k]))) errors[key] = `Fill in every field for each of your ${spec.label}.`;
    lists[key] = clean;
  }

  // Funding needs are the "job postings" funders match against.
  let rawNeeds: unknown;
  try {
    rawNeeds = JSON.parse(String(fd.get("fundingNeeds") ?? "[]"));
  } catch {
    rawNeeds = [];
  }
  const fundingNeeds: FundingNeed[] = (Array.isArray(rawNeeds) ? rawNeeds : []).slice(0, 10).map((r) => {
    const row = (r ?? {}) as Record<string, unknown>;
    const text = (k: string) => String(row[k] ?? "").trim().slice(0, 600);
    return {
      title: text("title"),
      type: text("type") as FundingType,
      amount: Math.round(Number(String(row.amount ?? "").replace(/[$,\s]/g, ""))),
      timeframe: text("timeframe"),
      description: text("description"),
    };
  });
  if (!fundingNeeds.length) errors.fundingNeeds = "Add at least 1 impact opportunity.";
  else if (fundingNeeds.some((n) => !n.title || !n.timeframe || !n.description))
    errors.fundingNeeds = "Fill in every field for each impact opportunity.";
  else if (fundingNeeds.some((n) => !FUNDING_TYPES.some((t) => t.id === n.type)))
    errors.fundingNeeds = "Choose a funding type for each opportunity.";
  else if (fundingNeeds.some((n) => !Number.isFinite(n.amount) || n.amount <= 0))
    errors.fundingNeeds = "Enter the amount sought, in dollars, for each impact opportunity.";

  const stewardship = {
    independentAudit: yesNo("independentAudit", "independent audit"),
    auditor: str("auditor", "Auditor (or explanation)", 300),
    conflictOfInterestPolicy: yesNo("conflictOfInterestPolicy", "conflict of interest policy"),
    whistleblowerPolicy: yesNo("whistleblowerPolicy", "whistleblower policy"),
    documentRetentionPolicy: yesNo("documentRetentionPolicy", "document retention policy"),
    funderReporting: str("funderReporting", "Reporting to funders", 800),
    impactMeasurement: str("impactMeasurement", "Impact measurement", 800),
    restrictedFunds: str("restrictedFunds", "Restricted funds policy", 800),
  };

  const file = fd.get("form990");
  if (!(file instanceof File) || file.size === 0) errors.form990 = "Upload your most recent Form 990 as a PDF.";
  else if (file.size > MAX_990_BYTES) errors.form990 = "The 990 PDF must be under 20 MB.";
  else if (!file.name.toLowerCase().endsWith(".pdf")) errors.form990 = "The 990 must be a PDF file.";

  if (fd.get("certify") !== "on") errors.certify = "You must certify that the information is accurate.";

  if (Object.keys(errors).length) return { errors };
  return {
    file: file as File,
    errors,
    data: {
      name,
      tagline,
      ein,
      website,
      city,
      state,
      yearFounded,
      geographicScope,
      contact,
      cause: cause as CauseSlug,
      focusAreas,
      mission,
      financials,
      stewardship,
      impactMetrics: lists.impactMetrics as Organization["impactMetrics"],
      trackRecord: lists.trackRecord as Organization["trackRecord"],
      networks: lists.networks as Organization["networks"],
      roadmap: lists.roadmap as Organization["roadmap"],
      board: lists.board as Organization["board"],
      fundingNeeds,
    },
  };
}
