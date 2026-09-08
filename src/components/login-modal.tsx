"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleGlyph, OrDivider } from "@/components/auth-forms";
import { useMockAuth } from "@/components/mock-auth";
import { useScrollLock } from "@/components/use-scroll-lock";

/* ---------------------------------------------------------------------------
 * The login modal.
 *
 * Logging in is not signing up: this drops you straight into an account that
 * is already set up, and must never send anyone into the onboarding wizard.
 * That belongs to "Join" alone.
 *
 * MOCK: either control signs you in as the same hardcoded person, and the
 * email is never read. It is a real field only so the shape of the screen can
 * be judged.
 * ------------------------------------------------------------------------- */

/**
 * Mounted once, in the layout. Reads whether it should be showing from the
 * auth context, so the header and the post composer open the same modal
 * rather than one each.
 */
export function LoginModalHost() {
  const { loginOpen, dismissLogin } = useMockAuth();
  return <LoginModal open={loginOpen} onClose={dismissLogin} />;
}

function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logIn } = useMockAuth();
  const [email, setEmail] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function signIn() {
    logIn();
    setEmail("");
    onClose();
  }

  /*
   * Portalled to <body> on purpose. This modal is rendered from inside the
   * header, and the header carries `backdrop-blur` — a backdrop-filter makes
   * an element a containing block for its fixed-position descendants, so an
   * un-portalled `fixed inset-0` here would size itself to the 59px header
   * rather than the viewport and centre the dialog off the top of the screen.
   * That was the bug.
   */
  return createPortal(
    /* Fixed to the viewport and centred by flex, so it does not care where the
       page happens to be scrolled to or how tall the content behind it is.
       The dialog caps its own height and scrolls inside itself, which is what
       keeps the top edge from ever landing above the fold. */
    <div className="z-modal-overlay fixed inset-0 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close log in"
        className="bg-scrim absolute inset-0 backdrop-blur-[1px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="card relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="login-title" className="text-2xl">
              Log in
            </h2>
            <p className="text-ink-soft mt-1 text-sm">Pick up where you left off.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close"
          >
            <CloseGlyph />
          </button>
        </div>

        {/* One line, easy to delete, so nobody mistakes this for real auth. */}
        <p className="chip text-ink-faint mt-3 border-dashed text-[0.62rem] tracking-[0.12em] uppercase">
          Mock login
        </p>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            signIn();
          }}
        >
          <label className="field-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="field"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <button type="submit" className="btn btn-primary mt-3 w-full">
            Continue
          </button>
        </form>

        <OrDivider />

        <button type="button" onClick={signIn} className="btn btn-paper w-full">
          <GoogleGlyph />
          Continue with Google
        </button>

        <p className="text-ink-faint mt-5 text-xs leading-relaxed">
          New here?{" "}
          <a href="/signup" className="link-ink font-semibold">
            Join instead
          </a>{" "}
          — that route asks you a few things first.
        </p>
      </div>
    </div>,
    document.body,
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
