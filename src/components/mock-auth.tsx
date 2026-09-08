"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/api";
import type { MockUser } from "@/lib/feed-mock";

/* ===========================================================================
 * Who is signed in — the whole app's single answer.
 *
 * There are two ways to have a session during this phase: a real Supabase one
 * (a cookie, checked on the server by getViewer()) and the mock one (React
 * state, gone on reload). They used to be read separately, which is how an
 * avatar ended up in the header for somebody who believed they were logged
 * out: the mock "Log out" cleared the mock session, the real cookie underneath
 * it was untouched, and the header simply fell through to showing that
 * instead. Two sources, one header, and no single place that could answer
 * "is anyone signed in?".
 *
 * So: `hasRealSession` comes in from the server layout, and `signedIn` is the
 * one boolean everything asks. Nothing else in the tree may decide for itself
 * what being signed in means.
 *
 * `requireAuth` is the gate. Browsing is open to everyone — the feed, profiles,
 * posts and comment threads all render for a visitor. Acting is not: giving
 * dhog, replying, searching and posting all go through here, and a visitor gets
 * the login modal instead of a dead click.
 * ========================================================================= */

type MockAuthValue = {
  /** The mock person, or null. Null does NOT mean signed out — see signedIn. */
  user: MockUser | null;
  /** Is anyone at all signed in, by either route? The only auth check to use. */
  signedIn: boolean;
  /** Signs in as the mock user. Logging in is not signing up — no onboarding. */
  logIn: () => void;
  /**
   * Ends the mock session. A real Supabase session is a cookie and can only be
   * cleared by the server action, so the header's Log out fires both — this
   * alone is not "logged out" if a real session exists.
   */
  logOut: () => void;
  /**
   * Applies an edit made in settings to the signed-in copy, so the header and
   * the profile page follow it without a reload. The write itself is lib/api's
   * job; this only keeps the session's idea of you in step with it.
   */
  updateUser: (patch: Partial<MockUser>) => void;
  /**
   * The gate in front of every action. Runs `action` and returns true when
   * somebody is signed in; otherwise opens the login modal and returns false.
   */
  requireAuth: (action?: () => void) => boolean;
  /**
   * Whether the login modal is showing. It lives here rather than in the
   * header because it is not the header's: anything that needs a signed-in
   * user — the post composer, say — can ask for it without growing its own
   * copy of the modal.
   */
  loginOpen: boolean;
  promptLogin: () => void;
  dismissLogin: () => void;
};

const MockAuthContext = createContext<MockAuthValue | null>(null);

export function MockAuthProvider({
  children,
  hasRealSession = false,
}: {
  children: React.ReactNode;
  /**
   * Resolved on the server before this ever renders, so there is no window in
   * which the client has to guess. Nothing here reads a cookie or storage.
   */
  hasRealSession?: boolean;
}) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const logIn = useCallback(() => {
    // Through lib/api rather than straight at the fixture: this is the call
    // that becomes supabase.auth.getUser().
    void getCurrentUser().then((signedIn) => {
      setUser(signedIn);
      setLoginOpen(false);
    });
  }, []);
  const logOut = useCallback(() => setUser(null), []);
  const updateUser = useCallback((patch: Partial<MockUser>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);
  const promptLogin = useCallback(() => setLoginOpen(true), []);
  const dismissLogin = useCallback(() => setLoginOpen(false), []);

  const signedIn = Boolean(user) || hasRealSession;

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (!signedIn) {
        setLoginOpen(true);
        return false;
      }
      action?.();
      return true;
    },
    [signedIn],
  );

  const value = useMemo(
    () => ({
      user,
      signedIn,
      logIn,
      logOut,
      updateUser,
      requireAuth,
      loginOpen,
      promptLogin,
      dismissLogin,
    }),
    [user, signedIn, logIn, logOut, updateUser, requireAuth, loginOpen, promptLogin, dismissLogin],
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth(): MockAuthValue {
  const value = useContext(MockAuthContext);
  if (!value) throw new Error("useMockAuth must be used inside <MockAuthProvider>");
  return value;
}
