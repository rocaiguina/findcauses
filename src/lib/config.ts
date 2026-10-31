/**
 * FindCauses lists mid-size nonprofits, measured by total annual expenses
 * reported on the latest Form 990 (Part I, line 18).
 */
export const MID_SIZE_MIN_BUDGET = 1_000_000;
export const MID_SIZE_MAX_BUDGET = 50_000_000;

export const BUDGET_BANDS = [
  { id: "1-5m", label: "$1M – $5M", min: 1_000_000, max: 5_000_000 },
  { id: "5-15m", label: "$5M – $15M", min: 5_000_000, max: 15_000_000 },
  { id: "15-50m", label: "$15M – $50M", min: 15_000_000, max: 50_000_000 },
] as const;

export const MAX_990_BYTES = 20 * 1024 * 1024;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA",
  "WA", "WV", "WI", "WY",
];
