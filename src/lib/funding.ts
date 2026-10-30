// Shared vocabulary for impact opportunities: nonprofits post projects that need funding,
// the way companies post jobs, and funders get a short list of the ones that fit.

export const FUNDING_TYPES = [
  { id: "general_operating", label: "General operating support" },
  { id: "program", label: "Program or project" },
  { id: "capital", label: "Capital (building, equipment)" },
  { id: "capacity", label: "Capacity building" },
  { id: "emergency", label: "Emergency or disaster response" },
] as const;
export type FundingType = (typeof FUNDING_TYPES)[number]["id"];

export const fundingTypeLabel = (id: string) => FUNDING_TYPES.find((t) => t.id === id)?.label ?? id;

export const ids = <T extends readonly { id: string }[]>(list: T) =>
  list.map((x) => x.id) as unknown as [T[number]["id"], ...T[number]["id"][]];
