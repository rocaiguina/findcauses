// Soft, grainy grayscale artwork: concentric halos around the JustCause mark's two overlapping rings.

export function RingsArtwork({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Two overlapping rings, a funder and a cause meeting">
      <defs>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f6f6f3" />
          <stop offset="45%" stopColor="#e4e5e8" />
          <stop offset="62%" stopColor="#f3f3f1" />
          <stop offset="78%" stopColor="#e9eaec" />
          <stop offset="100%" stopColor="#f7f7f5" />
        </radialGradient>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.06" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
        <filter id="soft">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      <rect width="400" height="400" rx="16" fill="url(#halo)" filter="url(#grain)" />
      <g fill="none" stroke="#3a3b45" strokeWidth="1.4" filter="url(#soft)">
        <circle cx="200" cy="200" r="104" strokeOpacity="0.85" />
        <circle cx="168" cy="200" r="62" />
        <circle cx="232" cy="200" r="62" />
      </g>
      <g fill="#2a2b35">
        <circle cx="200" cy="200" r="4" fill="#5266eb" />
        <circle cx="112" cy="146" r="3" />
        <circle cx="291" cy="249" r="3" />
        <circle cx="200" cy="96" r="2.2" />
        <circle cx="168" cy="262" r="2" />
      </g>
    </svg>
  );
}
