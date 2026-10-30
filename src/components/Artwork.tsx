// A hand-painted ribbon that draws itself through two overlapping loops (a funder and a cause meeting, like the
// logo) and wipes away behind itself. Pure SVG + CSS; the animation is .ribbon-band in globals.css.
//
// It imitates a flat multicolor marker held at a fixed angle: the same path is stroked once per color, each copy
// shifted by the same step, so the stripes widen and narrow naturally as the ribbon changes direction.

const COLORS = ["#d8a62a", "#8fca7a", "#2f7d46", "#5266eb", "#c7b5f3", "#e9622e", "#7a2a6f"];
const STEP = { x: 13, y: -9 };
const BAND_WIDTH = 19;

const PATH =
  "M 10 560 C 40 390 130 270 252 228 C 378 186 430 300 334 336 C 240 370 196 262 282 204 C 366 146 476 150 494 262 C 508 346 460 430 580 560";

export function RibbonArtwork({ className = "" }: { className?: string }) {
  const offset = (COLORS.length - 1) / 2;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#e7e1db] ${className}`}>
      <svg
        viewBox="0 0 600 480"
        className="block h-full w-full"
        role="img"
        aria-label="A painted ribbon of colors looping through two overlapping circles"
      >
        <defs>
          {/* Slightly rough, brushy edges. */}
          <filter id="brush" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          {/* Fine grain over the canvas. */}
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.07" />
            </feComponentTransfer>
          </filter>
        </defs>
        <g filter="url(#brush)" fill="none" strokeLinecap="butt" strokeLinejoin="round">
          {COLORS.map((color, i) => (
            <path
              key={color}
              d={PATH}
              pathLength={1}
              stroke={color}
              strokeWidth={BAND_WIDTH}
              transform={`translate(${(i - offset) * STEP.x} ${(i - offset) * STEP.y})`}
              className="ribbon-band"
            />
          ))}
        </g>
        <rect width="600" height="480" filter="url(#grain)" />
      </svg>
    </div>
  );
}
