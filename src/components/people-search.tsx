"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { VerifiedStamp } from "@/components/brand";
import { useMockAuth } from "@/components/mock-auth";
import { findPeople } from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import type { MockPerson } from "@/lib/feed-mock";

/* ---------------------------------------------------------------------------
 * Finding a person.
 *
 * Names only, matched client-side against the mock directory — there is no
 * search backend and this is not pretending there is one. It searches people
 * rather than posts on purpose: the thing you usually want here is a person
 * whose answers you already trust.
 *
 * Lives in the header, so it is reachable from every page rather than only
 * from the feed. The results panel is absolutely positioned inside a relative
 * wrapper, which keeps it out of the header's flow — opening it must not
 * change the height of the bar it sits in.
 *
 * Searching is an action, not browsing: a visitor can read every profile the
 * results would have led them to, but looking people up is behind the login.
 * The gate fires on the first keystroke — the field is left alone until then,
 * because a control that refuses focus reads as broken rather than as locked.
 * ------------------------------------------------------------------------- */

export function PeopleSearch() {
  const { signedIn, requireAuth } = useMockAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Never asked for while logged out, so a visitor's keystrokes do not reach
  // the directory at all.
  const { data: results } = useAsync<MockPerson[]>(
    () => (signedIn ? findPeople(query) : Promise.resolve([])),
    [],
    [query, signedIn],
  );
  const showing = signedIn && open && query.trim().length > 0;

  useEffect(() => {
    if (!showing) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showing]);

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <span className="text-ink-faint pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          <SearchGlyph />
        </span>
        <input
          type="search"
          className="field field-search rounded-full"
          placeholder="Search people…"
          aria-label="Search people"
          aria-expanded={showing}
          aria-controls={showing ? listId : undefined}
          role="combobox"
          value={query}
          onChange={(event) => {
            if (!requireAuth()) return;
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {showing ? (
        <div
          id={listId}
          role="listbox"
          aria-label="People"
          className="card z-dropdown absolute inset-x-0 top-full mt-2 overflow-hidden p-1.5"
        >
          {results.length > 0 ? (
            <ul>
              {results.map((person) => (
                <li key={person.slug}>
                  <Link
                    href={`/profile/${person.slug}`}
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="hover:bg-elevated flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors"
                  >
                    <Avatar name={person.name} size={32} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        <span className="truncate">{person.name}</span>
                        {person.verified ? <VerifiedStamp size={13} /> : null}
                      </span>
                      <span className="text-ink-faint block truncate text-xs">{person.role}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft px-2.5 py-3 text-sm">Nobody by that name — yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
