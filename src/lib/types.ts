import type { CauseSlug } from "./causes";

export type OrgStatus = "pending" | "approved" | "rejected";

export type BoardMember = { name: string; role: string; affiliation: string };
export type Milestone = { year: string; title: string; description: string };
export type ImpactMetric = { label: string; value: string };
export type NetworkTie = { name: string; type: string; description: string };
export type RoadmapItem = { timeframe: string; goal: string; description: string };

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

export type Organization = {
  id: string;
  slug: string;
  status: OrgStatus;
  submittedAt: string;
  reviewedAt?: string;
  /** Fictional seed profile used to demo the directory. */
  sample?: boolean;

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
  financials: Financials;
  board: BoardMember[];
  stewardship: Stewardship;

  /** Present when a Form 990 PDF is on file; the bytes live in `form990_files`. */
  form990?: { fileName: string };
};
