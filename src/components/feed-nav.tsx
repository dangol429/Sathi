"use client";

import { useEffect, useRef } from "react";
import { useScrollLock } from "@/components/use-scroll-lock";

/* ---------------------------------------------------------------------------
 * The left rail: where you are in the feed.
 *
 * Home and Trending are the same posts in a different order — Trending is a
 * sort, not a separate page. Categories is the niche filter; there is no
 * second filter row anywhere else on the page.
 *
 * Presentational only. All the state lives in FeedShell.
 * ------------------------------------------------------------------------- */

export type NavView = "home" | "trending";

export type NavCategory = { slug: string; name: string; emoji: string; count: number };

type NavProps = {
  view: NavView;
  niche: string | null;
  categories: NavCategory[];
  onHome: () => void;
  onTrending: () => void;
  onCategory: (slug: string) => void;
};

export function FeedNav({
  open,
  onOpenChange,
  ...nav
}: NavProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <aside className="z-sticky lg:sticky lg:top-20 lg:self-start">
      {/* Mobile: the rail collapses to one button. */}
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="btn btn-paper btn-sm w-full justify-start lg:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MenuGlyph />
        Browse
        <span className="text-ink-faint ml-auto text-xs font-semibold">
          {nav.view === "trending" ? "Trending" : "Home"}
        </span>
      </button>

      <div className="hidden lg:block">
        <NavList {...nav} />
      </div>

      {open ? <NavDrawer {...nav} onClose={() => onOpenChange(false)} /> : null}
    </aside>
  );
}

function NavDrawer({ onClose, ...nav }: NavProps & { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // The drawer sits over the page, so the page must not scroll under it.
  useScrollLock(true);

  useEffect(() => {
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="z-modal-overlay fixed inset-0 lg:hidden">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="bg-scrim absolute inset-0 backdrop-blur-[1px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Browse the feed"
        className="border-line bg-paper absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r-2 p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold">Browse</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close menu"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="mt-5">
          <NavList {...nav} />
        </div>
      </div>
    </div>
  );
}

function NavList({ view, niche, categories, onHome, onTrending, onCategory }: NavProps) {
  return (
    <nav aria-label="Feed">
      <ul className="space-y-1">
        <li>
          <NavItem active={view === "home" && niche === null} onClick={onHome}>
            <HomeGlyph />
            Home
          </NavItem>
        </li>
        <li>
          <NavItem active={view === "trending"} onClick={onTrending}>
            <TrendingGlyph />
            Trending
          </NavItem>
        </li>
      </ul>

      <p className="text-ink-soft mt-6 mb-2 px-3 text-[0.7rem] font-bold tracking-[0.14em] uppercase">
        Categories
      </p>

      <ul className="space-y-1">
        {categories.map((category) => (
          <li key={category.slug}>
            <NavItem active={niche === category.slug} onClick={() => onCategory(category.slug)}>
              <span aria-hidden>{category.emoji}</span>
              {category.name}
              <span
                className={`ml-auto text-xs font-semibold ${
                  niche === category.slug ? "text-on-accent/70" : "text-ink-faint"
                }`}
              >
                {category.count} post{category.count === 1 ? "" : "s"}
              </span>
            </NavItem>
          </li>
        ))}
      </ul>

      <p className="text-ink-faint mt-3 px-3 text-xs leading-relaxed">
        One niche at a time. The rest open when there are people to answer in them.
      </p>
    </nav>
  );
}

function NavItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-selected text-on-selected" : "hover:bg-elevated text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

/* --- Glyphs -------------------------------------------------------------- */

function HomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendingGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M4 16.5 9.5 11l3.5 3.5L20 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7.5h5v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
