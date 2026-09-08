"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* ===========================================================================
 * Light / dark.
 *
 * The whole switch is one attribute on <html>. Every colour in the app comes
 * from a custom property in globals.css, and the dark block redefines those
 * properties — so no component carries a dark variant of its own, and any
 * page built after this one gets dark mode for free.
 *
 * Persisted, unlike the mock auth. A theme that forgets itself on every page
 * load is not a theme, it is a light flash on the way to each page — which is
 * exactly what "inconsistent across pages" looked like. The choice is written
 * to localStorage and re-applied by a tiny script in <head> before first
 * paint, so there is no flash of the wrong palette either.
 * ========================================================================= */

export const THEME_STORAGE_KEY = "sathi-theme";

/**
 * Runs before React, straight out of <head>. Kept deliberately tiny and
 * failure-tolerant: private mode and blocked storage both just fall through to
 * the light default rather than throwing on every page.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${"sathi-theme"}");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}`;

type Theme = "light" | "dark";

type ThemeValue = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts light to match what the server rendered, then adopts whatever the
  // <head> script already put on <html>. Reading it in an effect rather than in
  // the initialiser keeps hydration honest — the alternative mismatches on the
  // toggle's own icon.
  const [theme, setTheme] = useState<Theme>("light");
  const [adopted, setAdopted] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.theme === "dark") setTheme("dark");
    setAdopted(true);
  }, []);

  useEffect(() => {
    if (!adopted) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage blocked: the toggle still works for this page's lifetime.
    }
  }, [theme, adopted]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>");
  return value;
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="hover:bg-elevated text-ink-soft hover:text-ink rounded-full p-2 transition-colors"
    >
      {dark ? <SunGlyph /> : <MoonGlyph />}
    </button>
  );
}

function MoonGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" aria-hidden>
      <path
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.3 6.3 4.8 4.8M19.2 19.2l-1.5-1.5M17.7 6.3l1.5-1.5M4.8 19.2l1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
