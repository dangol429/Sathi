"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* ---------------------------------------------------------------------------
 * Brief confirmations.
 *
 * One implementation, so everything that needs to say "that worked" behaves
 * the same: it appears, it goes away on its own after a few seconds, and it
 * can be dismissed by hand before then. A confirmation that needs dismissing
 * is not a confirmation, it is a chore.
 * ------------------------------------------------------------------------- */

const DISMISS_AFTER_MS = 4500;

type Toast = { id: number; message: string; tone: "ok" | "info" };

type ToastValue = {
  toast: (message: string, tone?: Toast["tone"]) => void;
};

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), message, tone }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="z-toast pointer-events-none fixed inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className={`card pointer-events-auto flex max-w-md items-center gap-3 py-2.5 pr-2 pl-4 text-sm font-semibold ${
        toast.tone === "ok" ? "border-jade" : ""
      }`}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="hover:bg-elevated text-ink-faint hover:text-ink rounded-full p-1.5 transition-colors"
      >
        <CloseGlyph />
      </button>
    </div>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside <ToastProvider>");
  return value;
}

/**
 * A banner that takes itself away.
 *
 * Used for the post-onboarding welcome, which previously sat at the top of the
 * feed for the rest of the session with no way to close it.
 */
export function DismissibleBanner({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setShown(false), DISMISS_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  if (!shown) return null;

  return (
    <div
      role="status"
      className="bg-jade text-on-accent flex items-center justify-center gap-3 px-4 py-2.5 text-center text-sm font-semibold"
    >
      <span>{children}</span>
      <button
        type="button"
        onClick={() => setShown(false)}
        aria-label="Dismiss"
        className="hover:bg-scrim rounded-full p-1 transition-colors"
      >
        <CloseGlyph />
      </button>
    </div>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
