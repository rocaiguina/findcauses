// Home artwork, painted like a flat multicolor marker: two ribbons (a cause from above, a funder from below)
// meet, converge into one ribbon, then multiply into five that fan out. Pure SVG + CSS, one shared loop.
//
// Each ribbon is the same path stroked once per color, each copy shifted by the same step, so stripes widen and
// narrow as the ribbon turns. The two incoming ribbons use the outer and inner stripe positions of the merged
// ribbon, so their stripes line up exactly where they meet.

const LOOP_SECONDS = 9;

// Merged ribbon, top to bottom: the cause's warm stripes, then the funder's cool ones.
const CAUSE = ["#d8a62a", "#e9622e", "#7a2a6f"];
const FUNDER = ["#5266eb", "#8fb3f0", "#2f7d46"];
const ALL = [...CAUSE, ...FUNDER];

const MEET = "240 236";
const SPLIT = "380 240";

const PATHS = {
  cause: `M -40 70 C 60 95 150 212 ${MEET}`,
  funder: `M -40 410 C 60 385 150 262 ${MEET}`,
  merged: `M ${MEET} C 285 238 330 240 ${SPLIT}`,
  branches: [
    `M ${SPLIT} C 430 240 470 110 650 30`,
    `M ${SPLIT} C 432 240 485 175 650 150`,
    `M ${SPLIT} C 434 240 495 252 650 262`,
    `M ${SPLIT} C 432 240 480 330 650 385`,
    `M ${SPLIT} C 428 240 455 395 610 530`,
  ],
};

type Stroke = { id: string; d: string; color: string; dy: number; width: number; start: number; end: number };

// Timeline, in percent of the loop: meet, converge, multiply, hold, fade.
const STRIPE = 13;
const BRANCH_STRIPE = 6;
const strokes: Stroke[] = [
  ...CAUSE.map((color, i) => ({ id: `c${i}`, d: PATHS.cause, color, dy: (i - 2.5) * STRIPE, width: 14, start: 0, end: 28 })),
  ...FUNDER.map((color, i) => ({ id: `f${i}`, d: PATHS.funder, color, dy: (i + 0.5) * STRIPE, width: 14, start: 4, end: 30 })),
  ...ALL.map((color, i) => ({ id: `m${i}`, d: PATHS.merged, color, dy: (i - 2.5) * STRIPE, width: 14, start: 30, end: 44 })),
  // Branches are slimmer ribbons of all six stripes, each leaving a beat after the last.
  ...PATHS.branches.flatMap((d, b) =>
    ALL.map((color, i) => ({ id: `b${b}${i}`, d, color, dy: (i - 2.5) * BRANCH_STRIPE, width: 6.5, start: 44 + b * 3, end: 66 + b * 3 })),
  ),
];

const HOLD_UNTIL = 84;
const FADED_AT = 95;

function keyframes(s: Stroke): string {
  return `@keyframes jc-${s.id}{0%{stroke-dashoffset:1;opacity:1}${s.start}%{stroke-dashoffset:1;opacity:1;animation-timing-function:cubic-bezier(.5,0,.25,1)}${s.end}%{stroke-dashoffset:0;opacity:1}${HOLD_UNTIL}%{stroke-dashoffset:0;opacity:1}${FADED_AT}%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:1;opacity:0}}.jc-${s.id}{animation:jc-${s.id} ${LOOP_SECONDS}s infinite}`;
}

// A soft ring that blooms where the ribbons meet, and again where they multiply.
const pulse = (name: string, at: number) =>
  `@keyframes jc-${name}{0%,${at}%{transform:scale(.2);opacity:0}${at + 2}%{opacity:.85}${at + 12}%{transform:scale(1.6);opacity:0}100%{transform:scale(1.6);opacity:0}}.jc-${name}{transform-box:fill-box;transform-origin:center;animation:jc-${name} ${LOOP_SECONDS}s infinite}`;

// Start a moment into the loop so the canvas isn't empty on load.
const START_AT = -1.2;

const CSS = [
  ".jc-ribbon path{stroke-dasharray:1 1;stroke-dashoffset:1}",
  ...strokes.map(keyframes),
  pulse("meet", 28),
  pulse("split", 43),
  // Finally a thin circle draws around the scene, so the last frame reads as the logo, painted large.
  `@keyframes jc-frame{0%,68%{stroke-dashoffset:1;opacity:.9;animation-timing-function:cubic-bezier(.5,0,.25,1)}82%{stroke-dashoffset:0;opacity:.9}${HOLD_UNTIL}%{stroke-dashoffset:0;opacity:.9}${FADED_AT}%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:1;opacity:0}}.jc-frame{stroke-dasharray:1 1;stroke-dashoffset:1;animation:jc-frame ${LOOP_SECONDS}s infinite}`,
  `.jc-ribbon path,.jc-pulse,.jc-frame{animation-delay:${START_AT}s}`,
  // Without motion, show the finished picture.
  "@media (prefers-reduced-motion:reduce){.jc-ribbon path,.jc-frame{animation:none;stroke-dashoffset:0;opacity:1}.jc-pulse{animation:none;opacity:0}}",
].join("");

export function RibbonArtwork({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#e7e1db] ${className}`}>
      <style>{CSS}</style>
      <svg
        viewBox="0 0 600 480"
        className="block h-full w-full"
        role="img"
        aria-label="Two painted ribbons meet, merge into one, and multiply into many"
      >
        <defs>
          {/* Slightly rough, brushy edges. */}
          <filter id="jc-brush" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
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
        <g className="jc-ribbon" filter="url(#jc-brush)" fill="none" strokeLinecap="butt" strokeLinejoin="round">
          {strokes.map((s) => (
            <path
              key={s.id}
              d={s.d}
              pathLength={1}
              stroke={s.color}
              strokeWidth={s.width}
              transform={`translate(0 ${s.dy})`}
              className={`jc-${s.id}`}
            />
          ))}
        </g>
        {/* Starts at the left, where the ribbons enter, and draws clockwise. */}
        <circle
          cx="310"
          cy="240"
          r="206"
          pathLength={1}
          fill="none"
          stroke="#1e1e2a"
          strokeWidth="2"
          transform="rotate(180 310 240)"
          className="jc-frame"
        />
        <g fill="none" stroke="#fffdf8" strokeWidth="3">
          <circle cx="240" cy="236" r="34" className="jc-pulse jc-meet" />
          <circle cx="380" cy="240" r="40" className="jc-pulse jc-split" />
        </g>
        <rect width="600" height="480" filter="url(#jc-grain)" />
      </svg>
    </div>
  );
}
