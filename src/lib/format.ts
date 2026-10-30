export function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
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
