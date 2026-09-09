/* ---------------------------------------------------------------------------
 * Is there a Supabase project to talk to at all?
 *
 * The app is deployed on mock data with no Supabase environment variables set,
 * and that is a supported state rather than a broken one. Every client
 * constructor used to read these with a `!` non-null assertion, so an unset
 * variable did not degrade — it threw. In middleware, which runs on every
 * request before anything else, that is a 500 on every route
 * (MIDDLEWARE_INVOCATION_FAILED) with nothing rendered to explain it.
 *
 * So: one check, here, and every place that builds a client asks it first.
 * Missing credentials mean "no session, no server data" — never an exception.
 *
 * These are read as whole `process.env.NEXT_PUBLIC_*` expressions on purpose.
 * Next.js substitutes them textually at build time for the browser bundle, and
 * destructuring or dynamic lookup would defeat that.
 * ------------------------------------------------------------------------- */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True only when both credentials are present. Everything that touches
 * Supabase is expected to check this and take its empty path if false.
 *
 * Note this is deliberately NOT gated on USE_MOCK_DATA. Real auth runs
 * alongside mock data in development — signup, onboarding, the review queue
 * and the real-session header all depend on it — so the question that decides
 * whether a client can be built is only ever "are the credentials there".
 * With no variables set, which is the deployed state, this is false and every
 * caller skips.
 */
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
