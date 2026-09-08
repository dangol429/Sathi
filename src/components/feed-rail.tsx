"use client";

import { VerifiedStamp } from "@/components/brand";
import { PersonAvatar, PersonName } from "@/components/person-link";
import { getActiveNow, getLeaderboard } from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import type { MockLeader } from "@/lib/feed-mock";

/* ---------------------------------------------------------------------------
 * The right rail: who is here, who is earning dhog, and a bell.
 *
 * All three are mock. Nothing tracks presence, nothing counts dhog, and the
 * bell does nothing when clicked — see lib/feed-mock.ts.
 * ------------------------------------------------------------------------- */

/**
 * Hardcoded for this pass. Supabase Realtime presence replaces the number
 * once the UI is signed off; the dot and the layout stay as they are.
 */
export function ActiveNow() {
  const { data: count } = useAsync<number>(getActiveNow, 0);

  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="relative flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden>
        <span className="bg-jade pulse-dot h-3 w-3 rounded-full" />
      </span>
      <p className="text-sm font-semibold">
        <span className="text-jade tabular-nums">{count}</span> online now
      </p>
    </div>
  );
}

export function DhogLeaderboard() {
  const { data: leaders } = useAsync<MockLeader[]>(getLeaderboard, []);

  return (
    <section className="card p-5">
      <h2 className="text-lg">Top dhog</h2>
      {/* Weekly only — see MockLeader. Lifetime is a profile credential, not a race. */}
      <p className="text-ink-faint mt-0.5 text-xs">Rolling seven days</p>

      <ol className="mt-4 space-y-3">
        {leaders.map((person, i) => (
          <li key={person.name} className="flex items-center gap-2.5">
            <span className="text-ink-faint w-3 shrink-0 text-sm font-bold tabular-nums">
              {i + 1}
            </span>
            <PersonAvatar name={person.name} size={32} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm leading-tight font-semibold">
                <PersonName name={person.name} className="truncate" />
                <VerifiedStamp size={13} />
              </p>
              <p className="text-ink-faint truncate text-xs">{person.detail}</p>
            </div>
            <span className="text-crimson shrink-0 text-sm font-bold tabular-nums">
              {person.weeklyDhog.toLocaleString("en-US")}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-ink-faint border-line mt-4 border-t pt-3 text-xs leading-relaxed">
        Dhog is what people hand you when an answer actually helped. It resets weekly here, so the
        board stays winnable.
      </p>
    </section>
  );
}
