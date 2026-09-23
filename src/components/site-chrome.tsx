"use client";

import { usePathname } from "next/navigation";

/**
 * Everything that makes a page look like Sathi — the header, the footer, the
 * prayer-flag rail, the chat dock — wrapped so one rule can take it all away
 * at once.
 *
 * /darbar is a different environment that happens to be served from the same
 * app. Giving it the member header would put a "Log in" button and a chat dock
 * on a moderation console, and would blur the one distinction that matters
 * there: whether you are looking at the site or at the machinery behind it.
 *
 * A pathname check rather than a route group, deliberately. Route groups would
 * mean relocating every existing page on the site to buy the same thing this
 * buys in four lines, and a layout move is a large change to make for a
 * cosmetic reason.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/darbar")) return null;
  return <>{children}</>;
}
