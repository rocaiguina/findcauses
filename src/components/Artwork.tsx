// Home artwork: each color is a strand that comes in from its own place around the edge. The strands meet in
// the middle and wind around each other into a knot that keeps growing, then a circle closes around it (the
// logo's frame). Pure SVG + CSS; the paths are computed here, once, on the server.

const LOOP_SECONDS = 11;
const W = 600;
const H = 480;
const CX = W / 2;
const CY = H / 2;

const COLORS = ["#d8a62a", "#e9622e", "#7a2a6f", "#5266eb", "#8fb3f0", "#2f7d46", "#c7b5f3", "#8fca7a", "#b8433a"];

const ENTRY_RADIUS = 470; // starts well outside the canvas
const MEET_RADIUS = 10;
const KNOT_MAX_RADIUS = 186;
const KNOT_TURNS = 3.4;

type Pt = [number, number];

/** Smooth curve through points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(pts: Pt[]): string {
  const f = (n: number) => n.toFixed(1);
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
 * Strand i: swirls in from the edge to the center, then loops around it with a slowly growing, lobed radius.
 * Alternating directions and lobe counts make the strands cross and weave.
 */
function strandPath(i: number, n: number): string {
  const entry = (i / n) * Math.PI * 2 + 0.35;
  const dir = i % 2 ? 1 : -1;
  const swirl = 0.9 * dir;
  const lobes = i % 3 === 0 ? 5 : 3;
  const phase = i * 1.7;
  const pts: Pt[] = [];

  // Approach: from far outside to the meeting point, curving as it comes.
  for (let k = 0; k <= 14; k++) {
    const s = k / 14;
    const r = ENTRY_RADIUS * (1 - s) ** 1.4 + MEET_RADIUS * s;
    const a = entry + swirl * s;
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }

  // Knot: loops around the center, each turn a little wider.
  const steps = 110;
  for (let k = 1; k <= steps; k++) {
    const u = k / steps;
    const a = entry + swirl + dir * u * Math.PI * 2 * KNOT_TURNS;
    const base = MEET_RADIUS + (KNOT_MAX_RADIUS - MEET_RADIUS) * u ** 0.9;
    const r = base * (0.68 + 0.32 * Math.sin(lobes * a + phase));
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  return smoothPath(pts);
}

// Timeline, in percent of the loop: strands set off one after another, all keep winding until the hold.
const strands = COLORS.map((color, i) => ({
  id: `s${i}`,
  color,
  d: strandPath(i, COLORS.length),
  start: i * 2.2,
  end: 78,
}));

const HOLD_UNTIL = 88;
const FADED_AT = 96;
// Start a moment into the loop so the canvas isn't empty on load.
const START_AT = -1.6;

const CSS = [
  ".jc-knot path{stroke-dasharray:1 1;stroke-dashoffset:1}",
  ...strands.map(
    (s) =>
      `@keyframes jc-${s.id}{0%{stroke-dashoffset:1;opacity:1}${s.start}%{stroke-dashoffset:1;opacity:1;animation-timing-function:cubic-bezier(.3,.15,.45,1)}${s.end}%{stroke-dashoffset:0;opacity:1}${HOLD_UNTIL}%{stroke-dashoffset:0;opacity:1}${FADED_AT}%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:1;opacity:0}}.jc-${s.id}{animation:jc-${s.id} ${LOOP_SECONDS}s infinite}`,
  ),
  // A soft bloom where the first strands meet.
  `@keyframes jc-meet{0%,9%{transform:scale(.2);opacity:0}11%{opacity:.8}22%{transform:scale(1.8);opacity:0}100%{opacity:0}}.jc-meet{transform-box:fill-box;transform-origin:center;animation:jc-meet ${LOOP_SECONDS}s infinite}`,
  // Finally a thin circle closes around the knot: the logo's frame.
  `@keyframes jc-frame{0%,74%{stroke-dashoffset:1;opacity:.9;animation-timing-function:cubic-bezier(.5,0,.25,1)}86%{stroke-dashoffset:0;opacity:.9}${HOLD_UNTIL}%{stroke-dashoffset:0;opacity:.9}${FADED_AT}%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:1;opacity:0}}.jc-frame{stroke-dasharray:1 1;stroke-dashoffset:1;animation:jc-frame ${LOOP_SECONDS}s infinite}`,
  `.jc-knot path,.jc-meet,.jc-frame{animation-delay:${START_AT}s}`,
  // Without motion, show the finished knot.
  "@media (prefers-reduced-motion:reduce){.jc-knot path,.jc-frame{animation:none;stroke-dashoffset:0;opacity:1}.jc-meet{animation:none;opacity:0}}",
].join("");

export function RibbonArtwork({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#e7e1db] ${className}`}>
      <style>{CSS}</style>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-full w-full"
        role="img"
        aria-label="Strands of color arrive from every side and tie a growing knot in the middle"
      >
        <defs>
          {/* Slightly rough, brushy edges. */}
          <filter id="jc-brush" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.06" numOctaves="2" seed="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Fine grain over the canvas. */}
          <filter id="jc-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.07" />
            </feComponentTransfer>
          </filter>
        </defs>
        <g className="jc-knot" filter="url(#jc-brush)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {strands.map((s) => (
            <path key={s.id} d={s.d} pathLength={1} stroke={s.color} strokeWidth={7} className={`jc-${s.id}`} />
          ))}
        </g>
        <circle cx={CX} cy={CY} r="26" fill="none" stroke="#fffdf8" strokeWidth="3" className="jc-meet" />
        {/* Starts at the top and draws clockwise. */}
        <circle
          cx={CX}
          cy={CY}
          r={KNOT_MAX_RADIUS + 22}
          pathLength={1}
          fill="none"
          stroke="#1e1e2a"
          strokeWidth="2"
          transform={`rotate(-90 ${CX} ${CY})`}
          className="jc-frame"
        />
        <rect width={W} height={H} filter="url(#jc-grain)" />
      </svg>
    </div>
  );
}
