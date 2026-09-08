"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/* ---------------------------------------------------------------------------
 * The shared behaviour behind every dropdown on the site.
 *
 * One implementation of: open/close, click-outside, Escape, and returning
 * focus to the trigger. Panels differ — a list of options, a list of
 * notifications — but none of them should have their own idea of when a
 * dropdown closes.
 *
 * Positioning is always absolute inside a relative anchor, so opening a panel
 * lays it over the page instead of pushing anything around. Nothing here
 * locks body scroll: these are small overlays, and locking would take the
 * scrollbar away and shift the page sideways.
 * ------------------------------------------------------------------------- */

export function usePopover() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!anchorRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close(true);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return { open, setOpen, close, anchorRef, triggerRef, panelId };
}

/**
 * The panel itself. A themed surface — the whole reason these are hand-built
 * rather than native <select>: a native options list is drawn by the operating
 * system and ignores the site's palette entirely, so dark mode never reached
 * it.
 */
export function PopoverPanel({
  id,
  align = "left",
  className = "",
  children,
  ...rest
}: {
  id?: string;
  align?: "left" | "right" | "stretch";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const position = align === "right" ? "right-0" : align === "stretch" ? "inset-x-0" : "left-0";

  return (
    <div
      id={id}
      className={`card z-dropdown absolute top-full mt-2 overflow-hidden p-1.5 ${position} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
