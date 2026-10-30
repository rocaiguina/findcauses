// The JustCause knot: colored strands arrive from around the edge, meet in the middle and wind into a knot.
// Shared by the home animation and the logo, so both are drawn from the same geometry.

export const KNOT_COLORS = ["#d8a62a", "#e9622e", "#7a2a6f", "#5266eb", "#8fb3f0", "#2f7d46", "#c7b5f3", "#8fca7a", "#b8433a"];

export type KnotOptions = {
  cx: number;
  cy: number;
  /** Where strands start, measured from the center. */
  entryRadius: number;
  /** How far the outermost loop reaches. */
  maxRadius: number;
  /** Loops each strand makes around the center. */
  turns: number;
  /** Points per strand; fewer for small sizes. */
  approachSteps?: number;
  knotSteps?: number;
  colors?: string[];
};

type Pt = [number, number];

/** Smooth curve through points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(pts: Pt[], decimals: number): string {
  const f = (n: number) => n.toFixed(decimals);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[Math.max(0, i - 1)], pts[i], pts[i + 1], pts[Math.min(pts.length - 1, i + 2)]];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * One path per strand: it swirls in from the edge to the center, then loops around it with a slowly growing,
 * lobed radius. Alternating directions and lobe counts make the strands cross and weave.
 */
export function knotStrands(o: KnotOptions): { color: string; d: string }[] {
  const colors = o.colors ?? KNOT_COLORS;
  const n = colors.length;
  const meet = o.maxRadius * 0.054;
  const approachSteps = o.approachSteps ?? 14;
  const knotSteps = o.knotSteps ?? 110;
  const decimals = o.maxRadius < 50 ? 2 : 1;

  return colors.map((color, i) => {
    const entry = (i / n) * Math.PI * 2 + 0.35;
    const dir = i % 2 ? 1 : -1;
    const swirl = 0.9 * dir;
    const lobes = i % 3 === 0 ? 5 : 3;
    const phase = i * 1.7;
    const pts: Pt[] = [];

    for (let k = 0; k <= approachSteps; k++) {
      const s = k / approachSteps;
      const r = o.entryRadius * (1 - s) ** 1.4 + meet * s;
      const a = entry + swirl * s;
      pts.push([o.cx + r * Math.cos(a), o.cy + r * Math.sin(a)]);
    }
    for (let k = 1; k <= knotSteps; k++) {
      const u = k / knotSteps;
      const a = entry + swirl + dir * u * Math.PI * 2 * o.turns;
      const base = meet + (o.maxRadius - meet) * u ** 0.9;
      const r = base * (0.68 + 0.32 * Math.sin(lobes * a + phase));
      pts.push([o.cx + r * Math.cos(a), o.cy + r * Math.sin(a)]);
    }
    return { color, d: smoothPath(pts, decimals) };
  });
}
