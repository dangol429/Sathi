"use client";

import { useCallback, useEffect, useState } from "react";
import { getSathiState, subscribeSathis, type SathiState } from "@/lib/api";

/* ---------------------------------------------------------------------------
 * The signed-in user's connections, kept in step across the whole screen.
 *
 * Accepting one Sathi request has to change four things at once: the button on
 * their profile, which Kura list their thread sits in, whether their posts pass
 * the feed's Sathis filter, and two Sathi counts. Each of those is a different
 * component, and none of them should have to know the others exist.
 *
 * So this reads through lib/api like everything else and re-reads whenever a
 * connection is written. That is exactly the shape a Realtime subscription
 * takes, which is the point: when connections become real, this hook changes
 * and nothing that uses it does.
 * ------------------------------------------------------------------------- */

/** What the viewer is to somebody else. */
export type SathiStatus = "self" | "sathi" | "incoming" | "outgoing" | "none";

const EMPTY: SathiState = { sathiIds: [], incoming: [], outgoing: [] };

export function useSathis(viewerSlug?: string) {
  const [state, setState] = useState<SathiState>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let live = true;
    void getSathiState().then((next) => {
      if (!live) return;
      setState(next);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const cancel = reload();
    // Re-read on every write, wherever in the tree it happened.
    const unsubscribe = subscribeSathis(() => reload());
    return () => {
      cancel();
      unsubscribe();
    };
  }, [reload]);

  const statusOf = useCallback(
    (slug: string | undefined): SathiStatus => {
      if (!slug) return "none";
      if (viewerSlug && slug === viewerSlug) return "self";
      if (state.sathiIds.includes(slug)) return "sathi";
      if (state.incoming.includes(slug)) return "incoming";
      if (state.outgoing.includes(slug)) return "outgoing";
      return "none";
    },
    [state, viewerSlug],
  );

  return { ...state, loading, statusOf, reload };
}
