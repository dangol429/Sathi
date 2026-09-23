"use client";

import { useId } from "react";

/* ===========================================================================
 * The wallpaper behind a conversation.
 *
 * The WhatsApp idea — a field of faint line doodles so a thread does not read
 * as a blank sheet — drawn from things that are actually Nepali rather than
 * the generic pizza-and-skateboard set: the Himalaya, prayer flags, a stupa
 * with its eyes, a pagoda roof, the khukuri, a singing bowl, a prayer wheel,
 * lali gurans, a lotus, momo, a glass of chiya, and the aankhijhyal lattice
 * window this codebase already borrows its texture from.
 *
 * Real SVG rather than a background-image data URI, for one reason that
 * matters here: `stroke="currentColor"` means the whole field takes its colour
 * from the theme. One asset, correct in both modes, instead of a light copy
 * and a dark copy that drift apart the first time either is touched.
 *
 * READABILITY comes first, and is handled three ways:
 *
 *   1. Opacity around 5%, set in globals.css per theme — visible as texture,
 *      never as content. Dark mode gets a touch more, because a faint light
 *      stroke on a dark ground disappears faster than the reverse.
 *   2. Every message bubble is a solid colour (--surface-elevated and
 *      --accent-crimson-wash are both opaque hex), so no text is ever read
 *      against the pattern — it only shows in the gaps, exactly as WhatsApp
 *      does it.
 *   3. It is behind the message list ONLY. The header, the composer and the
 *      Sathi notice keep their flat panel background, so the field you type
 *      into is never textured.
 *
 * aria-hidden and pointer-events-none: this is wallpaper. It must not be
 * announced, focusable, or in the way of a click on a message.
 * ========================================================================= */

/**
 * One tile, holding twelve motifs.
 *
 * 250 rather than 300: a panel is only about 300px wide, so a larger tile put
 * barely one motif per row on screen and the field read as sparse rather than
 * as wallpaper. At this size the repeat is still not legible, because at five
 * percent opacity you cannot see far enough to notice one.
 */
const TILE = 250;

export function KuraBackdrop() {
  // Two panels can be open at once, so the pattern id has to be per-instance
  // or the second panel would reference the first one's defs.
  const patternId = `kura-doodles-${useId().replace(/[:]/g, "")}`;

  return (
    <div aria-hidden className="kura-backdrop pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={patternId} patternUnits="userSpaceOnUse" width={TILE} height={TILE}>
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Scattered on a jittered grid — a neat grid would read as a
                  table, and the whole point is that it reads as texture. */}
              <g transform="translate(6 4) rotate(-5 22 22)">
                <Himalaya />
              </g>
              <g transform="translate(98 2) rotate(5 22 22)">
                <PrayerFlags />
              </g>
              <g transform="translate(192 8)">
                <Stupa />
              </g>
              <g transform="translate(48 66) rotate(-4 22 22)">
                <Pagoda />
              </g>
              <g transform="translate(140 62) rotate(14 22 22)">
                <Khukuri />
              </g>
              <g transform="translate(200 78)">
                <Aankhijhyal />
              </g>
              <g transform="translate(4 128)">
                <SingingBowl />
              </g>
              <g transform="translate(92 132) rotate(-7 22 22)">
                <PrayerWheel />
              </g>
              <g transform="translate(186 138) rotate(8 22 22)">
                <Rhododendron />
              </g>
              <g transform="translate(36 192)">
                <Lotus />
              </g>
              <g transform="translate(124 198) rotate(-6 22 22)">
                <Momo />
              </g>
              <g transform="translate(198 196) rotate(5 22 22)">
                <Chiya />
              </g>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

/* --- The motifs, each drawn inside a 44×44 box --------------------------- */

/** The range everything else in the country is measured against. */
function Himalaya() {
  return (
    <>
      <path d="M3 35 L14 13 L20 23 L27 9 L41 35 Z" />
      <path d="M24 15 L27 10 L30 15" />
      <path d="M11 19 L14 14 L17 19" />
    </>
  );
}

/** Lungta — the same prayer flags the site's top rail is made of. */
function PrayerFlags() {
  return (
    <>
      <path d="M3 9 Q22 21 41 9" />
      <path d="M9 13 L15 15 L11 21 Z" />
      <path d="M17 16 L23 17 L19 23 Z" />
      <path d="M25 16 L31 14 L28 21 Z" />
      <path d="M33 13 L38 10 L36 17 Z" />
    </>
  );
}

/** Boudhanath: the dome, the harmika, and the eyes on it. */
function Stupa() {
  return (
    <>
      <path d="M6 39 H38" />
      <path d="M9 33 Q22 17 35 33" />
      <path d="M16 24 H28 V31 H16 Z" />
      <path d="M18.5 28 h3 M25 28 h3" />
      <path d="M22 24 V11" />
      <path d="M19 19 H25" />
      <path d="M20 16 H24" />
      <circle cx="22" cy="9" r="2" />
    </>
  );
}

/** A Newari tiered roof — Nyatapola, and half of Bhaktapur. */
function Pagoda() {
  return (
    <>
      <path d="M5 19 L22 8 L39 19 Z" />
      <path d="M8 29 L22 21 L36 29" />
      <path d="M11 39 H33" />
      <path d="M14 29 V39" />
      <path d="M30 29 V39" />
      <path d="M22 8 V4" />
    </>
  );
}

/** The khukuri, blade down. */
function Khukuri() {
  return (
    <>
      <path d="M6 10 C20 12 30 20 35 31 C23 30 12 23 6 10 Z" />
      <path d="M35 31 L40 37" />
      <path d="M33 33 L38 39" />
    </>
  );
}

/** A singing bowl and its mallet. */
function SingingBowl() {
  return (
    <>
      <path d="M7 19 Q22 36 37 19" />
      <path d="M5 19 H39" />
      <path d="M31 6 V17" />
      <path d="M29 5 h4" />
    </>
  );
}

/** Mani wheel, on its handle. */
function PrayerWheel() {
  return (
    <>
      <rect x="13" y="9" width="18" height="21" rx="4" />
      <path d="M13 17 H31" />
      <path d="M13 23 H31" />
      <path d="M22 30 V38" />
      <path d="M18 39 H26" />
    </>
  );
}

/** Lali gurans, the national flower. Five petals, drawn once and turned. */
function Rhododendron() {
  return (
    <>
      {[0, 72, 144, 216, 288].map((angle) => (
        <path
          key={angle}
          d="M22 21 Q17 12 22 6 Q27 12 22 21 Z"
          transform={`rotate(${angle} 22 22)`}
        />
      ))}
      <circle cx="22" cy="22" r="2.5" />
    </>
  );
}

function Lotus() {
  return (
    <>
      <path d="M22 33 Q11 29 9 18 Q19 21 22 33 Z" />
      <path d="M22 33 Q33 29 35 18 Q25 21 22 33 Z" />
      <path d="M22 33 Q17 21 22 10 Q27 21 22 33 Z" />
      <path d="M8 33 Q22 38 36 33" />
    </>
  );
}

/** Momo, pleated. */
function Momo() {
  return (
    <>
      <path d="M8 26 Q22 38 36 26" />
      <path d="M8 26 Q8 14 14 13 Q18 8 22 12 Q26 8 30 13 Q36 14 36 26" />
      <path d="M14 13 Q16 18 15 22" />
      <path d="M22 12 Q22 18 22 22" />
      <path d="M30 13 Q28 18 29 22" />
    </>
  );
}

/** A glass of chiya, steaming. */
function Chiya() {
  return (
    <>
      <path d="M11 17 H31 V28 Q21 36 11 28 Z" />
      <path d="M31 19 Q38 19 38 23.5 Q38 28 31 28" />
      <path d="M8 38 H34" />
      <path d="M17 12 Q19 9 17 5" />
      <path d="M24 12 Q26 9 24 5" />
    </>
  );
}

/** Aankhijhyal — the Newari lattice window. */
function Aankhijhyal() {
  return (
    <>
      <rect x="8" y="8" width="28" height="28" rx="2" />
      <path d="M8 22 H36" />
      <path d="M22 8 V36" />
      <path d="M15 15 L29 29" />
      <path d="M29 15 L15 29" />
    </>
  );
}
