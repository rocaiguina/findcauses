import { knotStrands } from "@/lib/knot";
import { getImportedBySlug } from "@/lib/store";

// The website badge nonprofits embed: "FindCauses Certified" while they qualify, "Listed on FindCauses"
// otherwise, so a badge never claims more than is true today. Served as an image so it works on any site.

const MARK = knotStrands({ cx: 28, cy: 28, entryRadius: 15.5, maxRadius: 11.5, turns: 1.1, approachSteps: 6, knotSteps: 36 });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function badge(title: string, subtitle: string, certified: boolean): string {
  const strands = MARK.map((s) => `<path d="${s.d}" stroke="${s.color}" stroke-width="1" fill="none" stroke-linecap="round"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="56" viewBox="0 0 220 56" role="img" aria-label="${esc(title)}">
<rect x="0.5" y="0.5" width="219" height="55" rx="12" fill="#fbfbfd" stroke="${certified ? "#5266eb" : "#d9d9e3"}"/>
<g transform="translate(-4 0)">${strands.join("")}</g>
<text x="52" y="24" font-family="Inter,Helvetica,Arial,sans-serif" font-size="9.5" letter-spacing="2.2" fill="#6b6b7b">FINDCAUSES</text>
<text x="52" y="40" font-family="Inter,Helvetica,Arial,sans-serif" font-size="14" font-weight="600" fill="${certified ? "#3f51d6" : "#1e1e2a"}">${esc(subtitle)}</text>
</svg>`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const listing = await getImportedBySlug((await params).slug);
  const certified = Boolean(listing?.certified);
  const svg = listing
    ? badge(`${listing.name}: ${certified ? "FindCauses Certified" : "listed on FindCauses"}`, certified ? "Certified nonprofit" : "Listed nonprofit", certified)
    : badge("FindCauses", "Nonprofit directory", false);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      // Short cache: status can change (a 990 goes stale), and badges are cheap to render.
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
