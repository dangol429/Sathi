/* ---------------------------------------------------------------------------
 * Dhog, on the client.
 *
 * The earning formula is deliberately NOT in this file. Giver weights, context
 * multipliers, the per-pair decay and the caps all live in
 * supabase/migrations/20260101000500_dhog.sql and are resolved by a trigger at
 * write time — the client holds an insert grant on reactions but cannot choose
 * what a reaction is worth, and has no select grant on the weight columns.
 *
 * Anything shipped to a browser is readable by anyone, so publishing the
 * multipliers here would be publishing them in the UI. What a reader sees is
 * always a finished total and never the arithmetic behind it.
 *
 * Two totals come back from the database, from the dhog_lifetime and
 * dhog_weekly views:
 *
 *   lifetime — never decays; the credential on a profile
 *   weekly   — rolling seven days; the only thing the leaderboard reads, so
 *              the board stays winnable by someone who joined last month
 * ------------------------------------------------------------------------- */

export type DhogTotals = {
  lifetime: number;
  weekly: number;
};

/* ---------------------------------------------------------------------------
 * Recognition tiers, from lifetime dhog.
 *
 * ⚠️  THE NAMES BELOW ARE PLACEHOLDERS. TIER_1…TIER_5 are stand-ins and must
 * not ship. The real names should be Nepali and are a separate decision that
 * wants a native speaker — do not invent them here. Only `name` changes; the
 * thresholds and the lookup stay as they are.
 * ------------------------------------------------------------------------- */

export type RecognitionTier = {
  /** Stable key. Safe to store and to key styles off. */
  key: string;
  /** PLACEHOLDER — see the warning above. */
  name: string;
  /** Lifetime dhog at which this tier starts. */
  min: number;
};

export const RECOGNITION_TIERS: RecognitionTier[] = [
  { key: "TIER_1", name: "TIER_1", min: 0 },
  { key: "TIER_2", name: "TIER_2", min: 50 },
  { key: "TIER_3", name: "TIER_3", min: 250 },
  { key: "TIER_4", name: "TIER_4", min: 1000 },
  { key: "TIER_5", name: "TIER_5", min: 5000 },
];

/** The highest tier a lifetime total has reached. */
export function tierFor(lifetimeDhog: number): RecognitionTier {
  let reached = RECOGNITION_TIERS[0];
  for (const tier of RECOGNITION_TIERS) {
    if (lifetimeDhog >= tier.min) reached = tier;
  }
  return reached;
}

/**
 * What to show on a post or comment after someone gives dhog.
 *
 * Optimistic by design, and honest about it: a reaction from a brand-new
 * account is recorded but carries no weight, so the giver's own count moves
 * while nobody's total does. The server is the authority on the real number.
 */
export function displayDhog(stored: number, youGave: boolean): number {
  return stored + (youGave ? 1 : 0);
}
