// Isotipo de PersonalCheck: una "P" cuyo bowl se dibuja como un check.
// Recreado a mano como SVG a partir del logo en PNG (no es una vectorización
// automática) — usa `currentColor`-friendly CSS vars así respeta el tema.

function Marca() {
  return (
    <>
      <rect
        x="58"
        y="34"
        width="26"
        height="182"
        rx="13"
        fill="var(--color-acento)"
      />
      <path
        d="M84,52 C 130,25 205,45 190,88"
        fill="none"
        stroke="var(--color-acento)"
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M76,140 L108,178 L190,88"
        fill="none"
        stroke="var(--color-acento)"
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
      <Marca />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 340"
      className={className}
      role="img"
      aria-label="PersonalCheck"
    >
      <g transform="translate(110,0)">
        <Marca />
      </g>
      <text
        x="230"
        y="272"
        textAnchor="middle"
        fontFamily="var(--font-plex-sans)"
        fontWeight="700"
        fontSize="58"
        fill="var(--color-acento)"
      >
        Personal
      </text>
      <line
        x1="138"
        y1="300"
        x2="176"
        y2="300"
        stroke="var(--color-acento)"
        strokeWidth="2"
      />
      <text
        x="230"
        y="307"
        textAnchor="middle"
        fontFamily="var(--font-plex-sans)"
        fontWeight="500"
        letterSpacing="6"
        fontSize="20"
        fill="var(--color-acento)"
      >
        CHECK
      </text>
      <line
        x1="284"
        y1="300"
        x2="322"
        y2="300"
        stroke="var(--color-acento)"
        strokeWidth="2"
      />
    </svg>
  );
}
