"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MenuItem } from "@/components/popover";

/* ---------------------------------------------------------------------------
 * The menu that opens when you click your own message.
 *
 * Delete is always here; Edit only while the message is still inside its
 * fifteen-minute window. See PostActions for why the two are gated
 * differently — a message follows the same rule as a post, deliberately.
 *
 * Not PostActions/PopoverPanel reused as-is, because a message lives in a
 * genuinely different layout context. PopoverPanel is absolutely positioned
 * inside a relative anchor, which is fine for a post card — the card itself is
 * the scrollable unit. A message sits inside a thread panel with its OWN
 * inner `overflow-y-auto` list, so an absolutely-positioned menu gets clipped
 * the moment the message you clicked is near the bottom of that list — which
 * in a chat you are reading top to bottom, is most of them.
 *
 * So this portals to <body> and positions itself with `fixed` coordinates read
 * from the bubble's own bounding rect on open — the same escape this codebase
 * already uses for the login modal and the crop modal, and for the identical
 * reason: get out from under an ancestor that would clip or reposition it.
 *
 * It opens ABOVE the bubble by default. Kura's own dock sits at the bottom of
 * the screen, so the message you click is very often near the bottom of the
 * viewport too, and opening downward would routinely run straight off the
 * browser window. Desktop chat clients open a message's context menu upward
 * for the same reason — this is not a novel choice.
 *
 * Every own message that is still within its edit window gets its own
 * instance of this, mounted only while its menu is open, so there is nothing
 * to coordinate between one message's menu and another's.
 * ------------------------------------------------------------------------- */

const MENU_WIDTH = 176;
/** A generous estimate for the taller case — both Edit and Delete. */
const ESTIMATED_HEIGHT = 96;
const GAP = 8;

export function MessageActions({
  anchorRef,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Still inside the edit window. Delete does not depend on this. */
  canEdit: boolean;
  onClose: (returnFocus?: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  // Positioned once, from the bubble's own rect — not tracked continuously
  // during scroll, since the menu closes the moment the list scrolls anyway.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const openAbove = rect.top - ESTIMATED_HEIGHT - GAP >= 0;
    setStyle({
      position: "fixed",
      ...(openAbove ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
      // Own messages are always right-aligned in the panel, so the menu only
      // ever has to glue its right edge to the bubble's right edge — no need
      // to know the menu's own width to compute this. Clamped to 8px so a
      // bubble sitting hard against the viewport's right edge cannot push the
      // menu off it.
      right: Math.max(GAP, window.innerWidth - rect.right),
      width: MENU_WIDTH,
      // Above z-chat-widget on purpose: this menu is anchored to content
      // inside the chat widget and has to outrank it, and the scale has no
      // layer of its own for "a dropdown that lives inside another overlay" —
      // reusing the next rung up rather than inventing a new number.
    });
  }, [anchorRef]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose(true);
      }
    }
    // Scroll events do not bubble, but they do reach ancestors during the
    // capture phase — listening here, once, catches the message list
    // scrolling without needing a reference to which element is scrollable.
    function onScroll() {
      onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [anchorRef, onClose]);

  if (!style) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Message actions"
      style={style}
      className="card z-modal-overlay overflow-hidden p-1.5"
    >
      {canEdit ? (
        <MenuItem
          onClick={() => {
            onClose();
            onEdit();
          }}
        >
          <PencilGlyph />
          Edit
        </MenuItem>
      ) : null}

      {confirming ? (
        <MenuItem
          tone="danger"
          onClick={() => {
            onClose();
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
    </div>,
    document.body,
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
