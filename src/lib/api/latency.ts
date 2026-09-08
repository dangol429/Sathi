/**
 * A small, believable delay in front of the mock data.
 *
 * Not decoration: without it every mock call resolves in the same tick, and
 * components get written in a way that quietly assumes data is synchronous.
 * They then break the day a real network is underneath. This keeps the loading
 * states honest while the mock branch is still in use.
 */
export function mockDelay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** The real branch is not wired yet; this marks the spot precisely. */
export function notWired(fn: string): never {
  throw new Error(
    `${fn}: the Supabase branch is not implemented yet. ` +
      "Set NEXT_PUBLIC_USE_MOCK_DATA=true, or wire this function to the client.",
  );
}
