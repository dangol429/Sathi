"use client";

import { useEffect } from "react";

/**
 * Holds the page still while an overlay is open.
 *
 * One implementation for every overlay that covers the page — the login modal,
 * the mobile nav drawer, and anything added later. Duplicating this per
 * component is how the two of them ended up with slightly different ideas of
 * what "locked" means.
 *
 * The horizontal jump this used to cause is not fixed here: locking the body
 * removes the scrollbar, and the page then re-centres itself 15px to the side.
 * That is fixed once, in globals.css, with `scrollbar-gutter: stable` on the
 * html element — the gutter is always reserved, so taking the scrollbar away
 * moves nothing. Locking scroll without that rule reintroduces the shift.
 *
 * Nested overlays are counted rather than toggled, so closing one while
 * another is still open does not release the page early.
 */
let lockCount = 0;
let previousOverflow = "";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
