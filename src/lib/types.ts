import type { CauseSlug } from "./causes";
import type { Approach } from "./approach";
import type { FundingType } from "./funding";

export type OrgStatus = "pending" | "approved" | "rejected";

export type BoardMember = { name: string; role: string; affiliation: string };
export type Milestone = { year: string; title: string; description: string };
export type ImpactMetric = { label: string; value: string };
export type NetworkTie = { name: string; type: string; description: string };
export type RoadmapItem = { timeframe: string; goal: string; description: string };
/** A impact opportunity a nonprofit posts, the way a company posts a job. */
export type FundingNeed = {
  title: string;
  type: FundingType;
  /** Null when the organization hasn't said; never invented. */
  amount: number | null;
  timeframe: string | null;
  description: string;
  /** Added by JustCause rather than posted by the organization; labeled "Example". */
  example?: boolean;
};

/** Figures taken from the organization's most recent IRS Form 990. */
export type Financials = {
  fiscalYear: string;
  totalRevenue: number;
  contributions: number;
  programRevenue: number;
  totalExpenses: number;
  programExpenses: number;
  managementExpenses: number;
  fundraisingExpenses: number;
  totalAssets: number;
  netAssets: number;
  employees: number;
  volunteers: number;
};

export type Stewardship = {
  independentAudit: boolean;
  auditor: string;
  conflictOfInterestPolicy: boolean;
  whistleblowerPolicy: boolean;
  documentRetentionPolicy: boolean;
  funderReporting: string;
  impactMeasurement: string;
  restrictedFunds: string;
};

/** One row in the directory: either a full profile or an imported, unclaimed listing. */
export type DirectoryEntry = {
  kind: "profile" | "imported";
  id: string;
  href: string;
  name: string;
  summary: string;
  city?: string;
  state: string;
  cause: CauseSlug;
  tags: string[];
  yearFounded?: number;
  /** Total annual expenses from the latest 990, when known. */
  budget?: number;
  budgetYear?: string;
  revenue?: number;
  netAssets?: number;
  programShare?: number;
  staff?: number;
  audited?: boolean;
  /** Fictional demo organization. */
  example?: boolean;
  /** Posted funding needs; unclaimed listings have none and imply general operating support. */
  needs: FundingNeed[];
  /** How the organization drives change, inferred from its name, description and IRS code. */
  approaches: Approach[];
  /** Coalitions, partners and agencies it works with (full profiles only, for now). */
  partners: string[];
  /** Revenue change across its IRS filings, when there are at least two years apart. */
  growth?: { fromYear: number; toYear: number; pct: number };
  /** IRS tax-exemption ruling date (YYYY-MM-DD), when known. */
  irsSince?: string;
  searchText: string;
};

export type IrsFiling = {
  taxYear: number;
  formType: string;
  totalRevenue: number | null;
  totalExpenses: number | null;
  contributions: number | null;
  programRevenue: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  netAssets: number | null;
  pdfUrl: string | null;
};

export type ImportedListing = {
  id: string;
  slug: string;
  name: string;
  sources: ("pecunia" | "observatorio")[];
  city: string | null;
  state: string;
  cause: CauseSlug;
  tags: string[];
  mission: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  ein: string | null;
  irsName: string | null;
  irsMatchScore: number | null;
  nteeCode: string | null;
  irsRulingDate: string | null;
  /** Impact opportunities attached to the listing (examples until the organization claims it). */
  needs: FundingNeed[];
  /** Newest first. */
  filings: IrsFiling[];
};

export type Organization = {
  id: string;
  slug: string;
  status: OrgStatus;
  submittedAt: string;
  reviewedAt?: string;

  name: string;
  tagline: string;
  ein: string;
  website: string;
  city: string;
  state: string;
  yearFounded: number;
  geographicScope: string;
  contact: { name: string; title: string; email: string; phone: string };

  cause: CauseSlug;
  focusAreas: string[];
  mission: string;

  impactMetrics: ImpactMetric[];
  trackRecord: Milestone[];
  networks: NetworkTie[];
  roadmap: RoadmapItem[];
  fundingNeeds: FundingNeed[];
  financials: Financials;
  board: BoardMember[];
  stewardship: Stewardship;

  /** IRS tax-exemption ruling date (YYYY-MM-DD), looked up by EIN. */
  irsRulingDate?: string;
  /** Fictional demo organization, labeled "Example" everywhere. */
  example?: boolean;

  /** Present when a Form 990 PDF is on file; the bytes live in `form990_files`. */
  form990?: { fileName: string };
};
