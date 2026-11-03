/** The Varianto mark: a "V" whose branches stand for the variations of an opening. Decorative. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="#15803d" />
      <path
        d="M14 15 L32 49 L50 15"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M41 32 L52 40" fill="none" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="49" r="5.5" fill="#fbbf24" />
      <circle cx="14" cy="15" r="4" fill="#fbbf24" />
      <circle cx="50" cy="15" r="4" fill="#fbbf24" />
    </svg>
  )
}

/** The mark followed by the name, for use inside a heading or link. */
export function Brand({ size = 40 }: { size?: number }) {
  return (
    <span className="brand">
      <LogoMark size={size} />
      <span>Varianto</span>
    </span>
  )
}
