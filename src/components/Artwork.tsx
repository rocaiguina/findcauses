import { knotStrands } from "@/lib/knot";

// Home artwork: each color is a strand that comes in from its own place around the edge. The strands meet in
// the middle and wind around each other into a knot that keeps growing. Pure SVG + CSS; the paths come from
// the same knot as the logo (src/lib/knot.ts), computed once on the server.

const LOOP_SECONDS = 11;
const W = 600;
const H = 480;

const strands = knotStrands({ cx: W / 2, cy: H / 2, entryRadius: 470, maxRadius: 186, turns: 3.4 }).map((s, i) => ({
  ...s,
  id: `s${i}`,
  // Strands set off one after another; all keep winding until the hold.
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
  `.jc-knot path,.jc-meet{animation-delay:${START_AT}s}`,
  // Without motion, show the finished knot.
  "@media (prefers-reduced-motion:reduce){.jc-knot path{animation:none;stroke-dashoffset:0;opacity:1}.jc-meet{animation:none;opacity:0}}",
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
        <circle cx={W / 2} cy={H / 2} r="26" fill="none" stroke="#fffdf8" strokeWidth="3" className="jc-meet" />
        <rect width={W} height={H} filter="url(#jc-grain)" />
      </svg>
    </div>
  );
}
