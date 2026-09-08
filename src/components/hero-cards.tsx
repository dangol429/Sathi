"use client";

import { useEffect, useState } from "react";

/* ---------------------------------------------------------------------------
 * The cards floating next to the hero headline.
 *
 * This is a shop window for the feed, not a real feed — the point is that it
 * looks like a place where several different kinds of thing happen: a question
 * waiting on an answer, a professional offering their evening, and one doubt
 * that everybody is arguing about. Keep it varied over tidy.
 *
 * All copy lives in HERO_CARDS so it can be reworded without touching layout.
 * ------------------------------------------------------------------------- */

export type HeroCard = {
  /** Small caps label. Each card gets its own — a feed is not one format. */
  tag: string;
  /** Drives the tag colour and the footer treatment. */
  tone: "ask" | "offer" | "spicy";
  quote: string;
  /** Optional English reading, for the lines that are not in English. */
  gloss?: string;
  status: {
    label: string;
    /** Trailing detail: who answered, how loud the thread is. */
    note?: string;
  };
};

export const HERO_CARDS: HeroCard[] = [
  {
    tag: "Question from a learner",
    tone: "ask",
    quote: "Is a Kathmandu bootcamp worth 40,000 rupees if I have never finished a project?",
    status: { label: "Answered", note: "by a working designer" },
  },
  {
    tag: "Question from a learner",
    tone: "ask",
    quote: "What's the actual tech stack at Cedar Gate right now — not the JD, the real one.",
    status: { label: "Answered", note: "by a senior engineer" },
  },
  {
    tag: "From a professional",
    tone: "offer",
    quote:
      "Doing a free 30-min counselling session tonight at 8. First five to comment get a slot.",
    status: { label: "Live tonight" },
  },
  {
    tag: "Said out loud",
    tone: "spicy",
    quote: "K nepal maa basera ni kei garna sakincha?",
    gloss: "Can you actually build anything, staying in Nepal?",
    status: { label: "14 replies", note: "still going" },
  },
];

/** How long each card holds the front of the stack. */
const HOLD_MS = 5200;

/**
 * Where a card sits once it is N places behind the front one. Four entries for
 * four cards; anything deeper than the last entry reuses it.
 *
 * Every step goes the same way — right, down, and a degree and a half further
 * over — so the four of them read as one deck seen slightly from the side.
 * They used to alternate direction and rotate by four degrees at a time, which
 * did not look like a stack of paper, it looked like a dropped one.
 *
 * These four z-indexes order the deck against itself and nothing else. They
 * are 1–4 rather than values from the global scale precisely because they are
 * local: HeroCollage wraps this in `isolate`, so they are sealed inside their
 * own stacking context and cannot be compared with the header no matter what
 * they say. They read z-40 down to z-10 once, which tied with the navbar and
 * painted over it — small numbers make it obvious they are not global.
 */
const DEPTH = [
  "z-4 translate-x-0 translate-y-0 rotate-0 scale-100",
  "z-3 translate-x-2 translate-y-3 rotate-[1.5deg] scale-[0.975]",
  "z-2 translate-x-4 translate-y-6 rotate-[3deg] scale-[0.95]",
  "z-1 translate-x-6 translate-y-9 rotate-[4.5deg] scale-[0.925]",
];

const TAG_CLASS: Record<HeroCard["tone"], string> = {
  ask: "text-crimson",
  offer: "text-jade",
  spicy: "bg-marigold-wash text-turmeric -rotate-1 rounded-full px-2 py-0.5",
};

/**
 * Decorative on purpose: the whole collage is aria-hidden, so nothing here is
 * announced and nothing is focusable. Rotation stops for prefers-reduced-motion.
 */
export function HeroCardStack() {
  const [front, setFront] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFront((n) => (n + 1) % HERO_CARDS.length), HOLD_MS);
    return () => clearInterval(id);
  }, []);

  return (
    /* origin-top so a rotated card pivots at the edge it is stacked from,
       rather than swinging its top corner out from the middle. */
    <div className="relative h-64 origin-top">
      {HERO_CARDS.map((card, i) => {
        const depth = (i - front + HERO_CARDS.length) % HERO_CARDS.length;
        return (
          <div
            key={card.quote}
            className={`absolute inset-x-0 top-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${
              DEPTH[Math.min(depth, DEPTH.length - 1)]
            }`}
          >
            <HeroCardFace card={card} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * min-h gives every card the same floor, so a short one still peeks out from
 * behind a long one whichever way round the stack turns.
 */
function HeroCardFace({ card }: { card: HeroCard }) {
  return (
    <article className="card flex min-h-[10.5rem] flex-col p-5">
      <p
        className={`self-start text-[0.72rem] font-bold tracking-[0.16em] uppercase ${TAG_CLASS[card.tone]}`}
      >
        {card.tag}
      </p>

      <p className="font-display mt-2 text-lg leading-snug">&ldquo;{card.quote}&rdquo;</p>
      {card.gloss ? <p className="text-ink-faint mt-1.5 text-xs">{card.gloss}</p> : null}

      <div className="border-line mt-auto flex flex-wrap items-center gap-2 border-t pt-4">
        {card.tone === "offer" ? (
          <span className="bg-jade/12 text-jade inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold tracking-wider uppercase">
            <span className="bg-jade pulse-dot h-1.5 w-1.5 rounded-full" />
            {card.status.label}
          </span>
        ) : card.tone === "spicy" ? (
          <span className="text-crimson inline-flex items-center gap-1.5 text-xs font-bold">
            <span className="bg-crimson pulse-dot h-1.5 w-1.5 rounded-full" />
            {card.status.label}
          </span>
        ) : (
          <span className="stamp">{card.status.label}</span>
        )}

        {card.status.note ? (
          <span className="text-ink-faint text-xs">{card.status.note}</span>
        ) : null}
      </div>
    </article>
  );
}
