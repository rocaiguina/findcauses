// JustCause mark: two overlapping rings (a cause and a funder meeting) inside a circle. The funder's ring
// carries the brand color, as the funder's ribbon does in the home animation.

export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="16" r="14.5" />
      <circle cx="12.5" cy="16" r="6.5" />
      <circle cx="19.5" cy="16" r="6.5" stroke="#5266eb" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
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
