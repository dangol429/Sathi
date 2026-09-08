"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Runs a data-access function and tracks whether it has come back yet.
 *
 * Small on purpose. Every component that reads through lib/api needs the same
 * three things — a value, a loading flag, and a way to run it again after a
 * write — and writing that by hand in each one is how they drift apart.
 */
export function useAsync<T>(fn: () => Promise<T>, initial: T, deps: unknown[] = []) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fn()
      .then((value) => {
        if (live) setData(value);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, reload, setData };
}
