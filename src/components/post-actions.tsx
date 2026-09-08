"use client";

import { useEffect, useState } from "react";
import { PopoverPanel, usePopover } from "@/components/popover";
import { useToast } from "@/components/toast";

/* ---------------------------------------------------------------------------
 * The "…" on a post.
 *
 * Share is always there, on anybody's post. Edit and Delete belong to the
 * author and only for a quarter of an hour after posting — long enough to fix
 * a typo or think better of it, short enough that the thing somebody answered
 * cannot be rewritten underneath them afterwards.
 *
 * The window is checked in the browser against the post's timestamp, which is
 * a mock-phase shortcut: the real check is one comparison in an RLS policy
 * once posts carry a server timestamp. Nothing here should be mistaken for
 * enforcement.
 * ------------------------------------------------------------------------- */

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function editWindowRemaining(createdAt: number | undefined, now: number): number {
  if (!createdAt) return 0;
  return Math.max(0, createdAt + EDIT_WINDOW_MS - now);
}

export function PostActions({
  postId,
  isOwn,
  createdAt,
  onEdit,
  onDelete,
}: {
  postId: string;
  isOwn: boolean;
  createdAt?: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { open, setOpen, close, anchorRef, triggerRef, panelId } = usePopover();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [remaining, setRemaining] = useState(() => editWindowRemaining(createdAt, Date.now()));

  // Re-check when the window is due to close, so the actions disappear on
  // their own rather than lingering until the next unrelated render.
  useEffect(() => {
    if (!isOwn || remaining <= 0) return;
    const id = setTimeout(
      () => setRemaining(editWindowRemaining(createdAt, Date.now())),
      remaining,
    );
    return () => clearTimeout(id);
  }, [isOwn, createdAt, remaining]);

  const canEdit = isOwn && remaining > 0;

  async function share() {
    const url = `${window.location.origin}/feed#${postId}`;
    close(true);

    // The native sheet where there is one — that is what people expect on a
    // phone — and the clipboard everywhere else.
    if (navigator.share) {
      try {
        await navigator.share({ url, title: "A post on Sathi" });
        return;
      } catch {
        // Dismissed, or not permitted. Fall through to the clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Couldn't copy the link", "info");
    }
  }

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
            <MenuItem onClick={share}>
              <ShareGlyph />
              Share
            </MenuItem>

            {canEdit ? (
              <>
                <MenuItem
                  onClick={() => {
                    close();
                    onEdit();
                  }}
                >
                  <PencilGlyph />
                  Edit
                </MenuItem>

                {confirming ? (
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
                )}

                <p className="text-ink-faint px-2.5 pt-1.5 pb-1 text-xs">
                  {minutesLeft(remaining)} left to change it
                </p>
              </>
            ) : null}
          </div>
        </PopoverPanel>
      ) : null}
    </div>
  );
}

function minutesLeft(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return minutes <= 1 ? "under a minute" : `${minutes} minutes`;
}

function MenuItem({
  onClick,
  tone = "normal",
  children,
}: {
  onClick: () => void;
  tone?: "normal" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`hover:bg-elevated flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold transition-colors ${
        tone === "danger" ? "text-crimson" : "text-ink-soft"
      }`}
    >
      {children}
    </button>
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

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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
