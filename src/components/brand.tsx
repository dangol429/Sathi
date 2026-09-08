import Link from "next/link";

/**
 * The Nepali flag's double pennant — the only non-rectangular national flag in
 * the world, and the most recognisable silhouette we have. Used as the
 * wordmark's lockup and as a decorative mark.
 *
 * Drawn for 32px first, not for the poster size. Four things make it hold at
 * that scale, and all four were the reason it did not before:
 *
 *  1. The blue border is a stroke on a shape drawn UNDER an unstroked crimson
 *     fill, so the whole border sits outside the outline. Stroking a single
 *     path put half the border inside it, which ate the crimson field and
 *     rounded the pennant points into blobs from the inside out. Now the
 *     crimson runs to the exact geometry and the tips stay sharp.
 *  2. The notch between the pennants is a real concave vertex — the upper
 *     pennant's lower edge rises to its tip rather than running flat — so the
 *     two pennants read as two rather than as one dented shape.
 *  3. The sun is a solid disc with eight chunky triangular rays as one filled
 *     path. It was a disc plus eight hairline strokes, which at this size
 *     smeared into a halo.
 *  4. The moon is a much thicker crescent, and both emblems are drawn in a
 *     fixed white rather than a theme token that inverted in dark mode.
 *
 * Same concept throughout: crimson field, blue border, white moon and sun.
 */
export function Pennant({
  className = "",
  showEmblems = true,
}: {
  className?: string;
  showEmblems?: boolean;
}) {
  /* One definition, used twice: once stroked to make the border, once filled
     to lay the crimson field over the stroke's inner half. */
  const outline = "M6 6 L76 44 L26 58 L100 120 L6 120 Z";

  return (
    <svg
      viewBox="0 0 108 130"
      className={className}
      role="img"
      aria-label="Nepal flag pennant"
      fill="none"
    >
      {/* Border. Filled as well as stroked so there is no seam down the middle
          where the two halves of the stroke meet the fill. */}
      <path
        d={outline}
        fill="var(--flag-blue)"
        stroke="var(--flag-blue)"
        strokeWidth="9"
        strokeLinejoin="round"
      />
      {/* Field, exactly to the outline — this is what keeps the points sharp. */}
      <path d={outline} fill="var(--flag-crimson)" />

      {showEmblems ? (
        <g fill="var(--flag-white)">
          {/* Moon: two circles of the same radius, offset — a crescent with a
              waist nine units thick rather than the old three, and sized to
              sit alongside the sun rather than be dwarfed by it. */}
          <path d="M27.5 20.88 A12 12 0 1 0 27.5 43.12 A12 12 0 0 1 27.5 20.88 Z" />

          {/* Sun: an eight-pointed star whose valleys sit exactly on the disc
              below it, so the two merge into one solid shape. */}
          <path d="M32 76 L36.02 82.3 L43.31 80.69 L41.7 87.98 L48 92 L41.7 96.02 L43.31 103.31 L36.02 101.7 L32 108 L27.98 101.7 L20.69 103.31 L22.3 96.02 L16 92 L22.3 87.98 L20.69 80.69 L27.98 82.3 Z" />
          <circle cx="32" cy="92" r="10.5" />
        </g>
      ) : null}
    </svg>
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="Sathi — home">
      <Pennant className="h-8 w-auto transition-transform duration-200 group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-semibold tracking-tight">Sathi</span>
        <span className="font-deva text-ink-soft mt-0.5 text-[0.7rem] leading-none">साथी</span>
      </span>
    </Link>
  );
}

/** Prayer-flag colour rail. Sits at the very top of every page. */
export function LungtaRail() {
  return <div className="lungta-rail" aria-hidden />;
}

/** Marigold-garland divider (sayapatri mala). */
export function Garland({ className = "" }: { className?: string }) {
  return <div className={`garland ${className}`} aria-hidden />;
}

/**
 * Lungta bunting divider — the five prayer-flag colours strung on a line,
 * repeated across the full width.
 *
 * Two deliberate choices:
 *  - The <svg> has no viewBox and the pattern is in `userSpaceOnUse`, so the
 *    flags keep a fixed size and simply repeat more times on a wider screen.
 *    A viewBox with preserveAspectRatio="none" would stretch them instead.
 *  - Each flag is nudged a degree or two off vertical, pivoting on the string,
 *    so the run reads as hand-strung rather than printed. The rotations stay
 *    small and the last flag leans inward — any further and the pattern tile
 *    clips its corner, which shows up as a hard vertical cut every 90px.
 *
 * The gentle sway lives in `.lungta-flags` in globals.css.
 */
export function PrayerFlags({ className = "" }: { className?: string }) {
  return (
    <div className={`lungta-flags ${className}`} aria-hidden>
      <svg width="100%" height="40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="lungta-bunting" width="90" height="40" patternUnits="userSpaceOnUse">
            <line x1="0" y1="4" x2="90" y2="4" stroke="var(--color-ink-soft)" strokeWidth="1.5" />
            <rect
              x="4"
              y="4"
              width="14"
              height="22"
              fill="var(--color-lungta-blue)"
              transform="rotate(-2 4 4)"
            />
            <rect
              x="22"
              y="4"
              width="14"
              height="22"
              fill="var(--color-lungta-white)"
              transform="rotate(1.5 22 4)"
            />
            <rect
              x="40"
              y="4"
              width="14"
              height="22"
              fill="var(--color-lungta-red)"
              transform="rotate(-1.2 40 4)"
            />
            <rect
              x="58"
              y="4"
              width="14"
              height="22"
              fill="var(--color-lungta-green)"
              transform="rotate(2 58 4)"
            />
            <rect
              x="76"
              y="4"
              width="14"
              height="22"
              fill="var(--color-lungta-yellow)"
              transform="rotate(1.8 76 4)"
            />
          </pattern>
        </defs>
        <rect width="100%" height="40" fill="url(#lungta-bunting)" />
      </svg>
    </div>
  );
}

/**
 * Layered Himalaya ridge for the footer. Three passes at different opacities
 * so it reads as distance rather than as one flat shape.
 */
export function HimalayaRidge({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 160"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
      fill="none"
    >
      <path
        d="M0 160 L90 74 L150 108 L245 38 L320 96 L400 60 L470 112 L560 44 L640 100 L720 66 L800 118 L880 52 L960 104 L1050 70 L1120 120 L1200 82 L1200 160 Z"
        fill="var(--color-indigo)"
        opacity="0.18"
      />
      <path
        d="M0 160 L120 96 L200 128 L300 70 L380 118 L470 84 L540 130 L640 78 L730 124 L820 92 L900 134 L1010 96 L1100 138 L1200 110 L1200 160 Z"
        fill="var(--color-indigo)"
        opacity="0.3"
      />
      <path
        d="M0 160 L140 128 L260 148 L380 120 L500 146 L620 122 L760 150 L900 126 L1040 152 L1200 132 L1200 160 Z"
        fill="var(--color-jade)"
        opacity="0.4"
      />
    </svg>
  );
}

/**
 * The verified marker: a filled badge with a check in it, sitting next to the
 * name — the shape every platform has trained people to read at a glance.
 * It replaced a crimson pill with the word VERIFIED in it, which took a line
 * of its own and shouted louder than the name it was qualifying.
 *
 * Marigold rather than crimson: crimson is the one saturated accent the dark
 * theme lets pop, and it is spoken for by primary actions and dhog.
 */
export function VerifiedStamp({
  founding = false,
  size = 15,
}: {
  founding?: boolean;
  size?: number;
}) {
  if (founding) {
    return (
      <span className="stamp stamp-founding" title="One of the first professionals to join">
        Founding member
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="text-marigold inline-block shrink-0 align-[-0.12em]"
      role="img"
      aria-label="Verified"
    >
      <title>Verified — LinkedIn checked by a human</title>
      {/* Scalloped badge, the seal shape rather than a plain circle. */}
      <path
        fill="currentColor"
        d="M12 1.6l2.36 1.74 2.9-.28 1.1 2.7 2.55 1.42-.6 2.86.6 2.86-2.55 1.42-1.1 2.7-2.9-.28L12 22.4l-2.36-1.74-2.9.28-1.1-2.7-2.55-1.42.6-2.86-.6-2.86 2.55-1.42 1.1-2.7 2.9.28L12 1.6z"
      />
      <path
        d="m7.9 12.2 2.7 2.7 5.5-5.6"
        fill="none"
        stroke="var(--color-snow)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
