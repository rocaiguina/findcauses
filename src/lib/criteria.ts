import { APPROACHES, approachLabel, type Approach } from "./approach";
import { CAUSES, type CauseSlug } from "./causes";
import { FUNDING_TYPES, type FundingType } from "./funding";
import type { FunderPrefs } from "./match";

// The finder's answers. They live in the URL (no account, nothing saved), so a shortlist can be
// bookmarked or shared with colleagues: /opportunities?c=education,public-health&g=100k-500k&m=990

export const GIFT_BANDS = [
  { id: "under-25k", label: "Under $25K", min: null, max: 25_000 },
  { id: "25k-100k", label: "$25K – $100K", min: 25_000, max: 100_000 },
  { id: "100k-500k", label: "$100K – $500K", min: 100_000, max: 500_000 },
  { id: "500k-1m", label: "$500K – $1M", min: 500_000, max: 1_000_000 },
  { id: "1m-plus", label: "$1M or more", min: 1_000_000, max: null },
] as const;

// Older shared links used "500k-plus" before the large-gift bands were split.
const GIFT_ALIASES: Record<string, GiftBand> = { "500k-plus": "500k-1m" };

export const SIZES = [
  { id: "mid", label: "Mid-size", help: "$1M–$50M budget: track record, and your gift still matters", min: 1_000_000, max: 50_000_000 },
  { id: "small", label: "Small", help: "Under $1M: grassroots, where a gift goes far", min: null, max: 1_000_000 },
  { id: "large", label: "Large", help: "Over $50M: established institutions", min: 50_000_000, max: null },
  { id: "any", label: "No preference", help: "Any size", min: null, max: null },
] as const;

export const MUST_HAVES = [
  { id: "990", label: "Form 990 financials available" },
  { id: "audit", label: "Independently audited" },
  { id: "5y", label: "IRS-recognized 5+ years" },
  { id: "10y", label: "IRS-recognized 10+ years" },
] as const;

export const PLACES = [
  { id: "PR", label: "Puerto Rico" },
  { id: "any", label: "Anywhere" },
] as const;

export type GiftBand = (typeof GIFT_BANDS)[number]["id"];
export type Size = (typeof SIZES)[number]["id"];
export type MustHave = (typeof MUST_HAVES)[number]["id"];
export type Place = (typeof PLACES)[number]["id"];

export type Criteria = {
  causes: CauseSlug[];
  approaches: Approach[];
  place: Place;
  gift: GiftBand | null;
  types: FundingType[];
  size: Size | null;
  must: MustHave[];
};

export const MAX_CAUSES = 3;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function get(params: Params, key: string): string {
  const v = params instanceof URLSearchParams ? params.get(key) : params[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

const list = <T extends string>(raw: string, allowed: readonly string[]) =>
  [...new Set(raw.split(",").filter((x) => allowed.includes(x)))] as T[];

export function parseCriteria(params: Params): Criteria {
  const one = <T extends string>(key: string, allowed: readonly { id: string }[]) => {
    const v = get(params, key);
    return allowed.some((a) => a.id === v) ? (v as T) : null;
  };
  return {
    causes: list<CauseSlug>(get(params, "c"), CAUSES.map((c) => c.slug)).slice(0, MAX_CAUSES),
    approaches: list<Approach>(get(params, "a"), APPROACHES.map((a) => a.id)),
    place: one<Place>("p", PLACES) ?? "PR",
    gift: one<GiftBand>("g", GIFT_BANDS) ?? GIFT_ALIASES[get(params, "g")] ?? null,
    types: list<FundingType>(get(params, "t"), FUNDING_TYPES.map((t) => t.id)),
    size: one<Size>("sz", SIZES),
    must: list<MustHave>(get(params, "m"), MUST_HAVES.map((m) => m.id)),
  };
}

export function toQuery(c: Criteria): string {
  const q = new URLSearchParams();
  if (c.causes.length) q.set("c", c.causes.join(","));
  if (c.approaches.length) q.set("a", c.approaches.join(","));
  if (c.place !== "PR") q.set("p", c.place);
  if (c.gift) q.set("g", c.gift);
  if (c.types.length) q.set("t", c.types.join(","));
  if (c.size) q.set("sz", c.size);
  if (c.must.length) q.set("m", c.must.join(","));
  return q.toString();
}

export const isAnswered = (c: Criteria) => c.causes.length > 0 && c.gift != null;

export function toPrefs(c: Criteria): FunderPrefs {
  const gift = GIFT_BANDS.find((g) => g.id === c.gift);
  const size = SIZES.find((s) => s.id === c.size);
  const years = c.must.includes("10y") ? 10 : c.must.includes("5y") ? 5 : null;
  return {
    causes: c.causes,
    approaches: c.approaches,
    states: c.place === "any" ? [] : [c.place],
    fundingTypes: c.types,
    orgBudgetMin: size?.min ?? null,
    orgBudgetMax: size?.max ?? null,
    giftMin: gift?.min ?? null,
    giftMax: gift?.max ?? null,
    requires990: c.must.includes("990"),
    requiresAudit: c.must.includes("audit"),
    minIrsYears: years,
  };
}

/** Short labels for the answer chips above the results. */
export function describe(c: Criteria): string[] {
  return [
    ...c.causes.map((s) => CAUSES.find((x) => x.slug === s)?.label ?? s),
    ...c.approaches.map(approachLabel),
    PLACES.find((p) => p.id === c.place)!.label,
    ...(c.gift ? [`Gift ${GIFT_BANDS.find((g) => g.id === c.gift)!.label}`] : []),
    ...c.types.map((t) => FUNDING_TYPES.find((x) => x.id === t)!.label),
    ...(c.size && c.size !== "any" ? [`${SIZES.find((s) => s.id === c.size)!.label} orgs`] : []),
    ...c.must.map((m) => MUST_HAVES.find((x) => x.id === m)!.label),
  ];
}
