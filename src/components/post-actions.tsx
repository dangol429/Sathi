"use client";

import { useEffect, useState } from "react";
import { MenuItem, PopoverPanel, usePopover } from "@/components/popover";
import { editWindowRemaining } from "@/lib/edit-window";

/* ---------------------------------------------------------------------------
 * The "…" on a post — the author's menu, and only the author's.
 *
 * Share used to live here as well, which made this the one menu everybody saw
 * and left it holding a single item on a stranger's post. Share is now a
 * control in the footer beside the other things you can do to a post, where
 * people look for it, so there is nothing left in here for anyone but the
 * author and the button does not render for anyone else. An overflow menu with
 * one thing in it was overflow for nothing.
 *
 * Edit and Delete are not gated the same way:
 *
 *   Delete   always. Taking your own writing off the site is not something
 *            that should expire — the alternative is telling someone their
 *            words are stuck there forever because they thought better of it
 *            sixteen minutes too late.
 *   Edit     for a quarter of an hour. Long enough to fix a typo, short
 *            enough that the thing somebody answered cannot be rewritten
 *            underneath them afterwards. That asymmetry is the point: a
 *            deletion is visibly gone, a silent edit is not.
 *
 * The window lives in lib/edit-window.ts, shared with the same menu on a Kura
 * message. It is checked in the browser against the post's timestamp, which is
 * a mock-phase shortcut: the real check is one comparison in an RLS policy
 * once posts carry a server timestamp. Nothing here should be mistaken for
 * enforcement.
 * ------------------------------------------------------------------------- */

export function PostActions({
  isOwn,
  createdAt,
  onEdit,
  onDelete,
}: {
  isOwn: boolean;
  createdAt?: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { open, setOpen, close, anchorRef, triggerRef, panelId } = usePopover();
  const [confirming, setConfirming] = useState(false);
  const [remaining, setRemaining] = useState(() => editWindowRemaining(createdAt, Date.now()));

  // Re-check when the window is due to close, so Edit disappears on its own
  // rather than lingering until the next unrelated render.
  useEffect(() => {
    if (!isOwn || remaining <= 0) return;
    const id = setTimeout(
      () => setRemaining(editWindowRemaining(createdAt, Date.now())),
      remaining,
    );
    return () => clearTimeout(id);
  }, [isOwn, createdAt, remaining]);

  const canEdit = isOwn && remaining > 0;
  const canDelete = isOwn;

  // Nothing to offer on somebody else's post any more, so no button either.
  // Hooks run first, above, because they cannot be called conditionally.
  if (!isOwn) return null;

  return (
    <div className="relative" ref={anchorRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setConfirming(false);
          setOpen(!open);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="Post actions"
        className="hover:bg-elevated text-ink-faint hover:text-ink rounded-full p-1.5 transition-colors"
      >
        <MoreGlyph />
      </button>

      {open ? (
        <PopoverPanel id={panelId} align="right" className="w-44">
          <div role="menu" aria-label="Post actions">
            {canEdit ? (
              <MenuItem
                onClick={() => {
                  close();
                  onEdit();
                }}
              >
                <PencilGlyph />
                Edit
              </MenuItem>
            ) : null}

            {canDelete ? (
              confirming ? (
                <MenuItem
                  tone="danger"
                  onClick={() => {
                    close();
                    onDelete();
                  }}
                >
                  <TrashGlyph />
                  Really delete?
                </MenuItem>
              ) : (
                <MenuItem tone="danger" onClick={() => setConfirming(true)}>
                  <TrashGlyph />
                  Delete
                </MenuItem>
              )
            ) : null}
          </div>
        </PopoverPanel>
      ) : null}
    </div>
  );
}

function MoreGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M5 7h14M10 7V5h4v2m-7 0 .8 12h8.4L17 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
