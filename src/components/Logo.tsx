// JustCause mark: the home animation in miniature. A cause (warm) and a funder (cool) meet, run together as
// one line, then multiply into three, inside a circle.

export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="16" r="14.75" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 10.5C8.5 11.5 10.5 15 13 15.6" stroke="#e9622e" strokeWidth="2" />
      <path d="M5 21.5C8.5 20.5 10.5 17 13 16.4" stroke="#5266eb" strokeWidth="2" />
      <path d="M13 16h4.5" stroke="currentColor" strokeWidth="2.6" />
      <path
        d="M17.5 16C21 16 22.5 11 27 9.5M17.5 16H27.6M17.5 16C21 16 22.5 21 27 22.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
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
