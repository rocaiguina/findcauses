// Drops trailing zeros: 1.00 → 1, 50.0 → 50, 1.90 → 1.9.
const trim = (s: string) => s.replace(/\.0+$|(\.\d*?)0+$/, "$1");

export function money(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${trim((n / 1_000_000_000).toFixed(2))}B`;
  if (n >= 1_000_000) return `$${trim((n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2))}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

export function moneyFull(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Whole years elapsed since an ISO date (YYYY-MM-DD). */
export function yearsSince(isoDate: string, now = new Date()): number {
  const d = new Date(`${isoDate}T00:00:00Z`);
  let years = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate()))
    years--;
  return Math.max(0, years);
}

/** "Mar 1994" style label for an ISO date. */
export function monthYear(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** e.g. "32 years" or "Under 1 year". */
export function tenure(isoDate: string): string {
  const y = yearsSince(isoDate);
  return y < 1 ? "Under 1 year" : `${y} ${y === 1 ? "year" : "years"}`;
}

const SEARCH_STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "y", "the", "of", "and", "for", "a", "an", "inc", "para", "una", "un"]);

/** Lowercase, accent-free words used for directory search on both the query and the indexed text. */
export function searchWords(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !SEARCH_STOPWORDS.has(w));
}

/** "Puerto Rico" for PR; other states keep their postal code. */
export function placeName(state: string): string {
  return state === "PR" ? "Puerto Rico" : state;
}
