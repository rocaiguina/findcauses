import { knotStrands } from "@/lib/knot";

// JustCause mark: the knot from the home animation, at rest. Same strands and colors, with fewer turns so it
// stays legible at small sizes.
const MARK = knotStrands({ cx: 16, cy: 16, entryRadius: 15.5, maxRadius: 11.5, turns: 1.1, approachSteps: 6, knotSteps: 36 });

export function LogoMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {MARK.map((s) => (
        <path key={s.color} d={s.d} stroke={s.color} strokeWidth="0.95" />
      ))}
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="text-[15px] font-medium tracking-[0.28em]">JUSTCAUSE</span>
    </span>
  );
}
