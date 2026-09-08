"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function callbackUrl(next: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function GoogleButton({
  next,
  label = "Continue with Google",
}: {
  next: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl(next),
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) setError(oauthError.message);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="btn btn-paper w-full"
      >
        <GoogleGlyph />
        {pending ? "Opening Google…" : label}
      </button>
      {error ? <FormError message={error} /> : null}
    </div>
  );
}

export function EmailAuthForm({
  mode,
  next,
  submitLabel,
}: {
  mode: "signup" | "login";
  next: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkInbox, setCheckInbox] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("full_name") ?? "").trim();

    setError(null);

    startTransition(async () => {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl(next),
            data: fullName ? { full_name: fullName } : undefined,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        // No session means the project requires email confirmation.
        if (!data.session) {
          setCheckInbox(true);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      }

      router.push(next);
      router.refresh();
    });
  }

  if (checkInbox) {
    return (
      <div className="card-soft border-indigo/40 bg-indigo/5 p-4 text-sm">
        <p className="font-semibold">Check your inbox.</p>
        <p className="text-ink-soft mt-1 leading-relaxed">
          We sent you a confirmation link. Open it and you will land back here, signed in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === "signup" ? (
        <div>
          <label className="field-label" htmlFor="full_name">
            Your name
          </label>
          <input
            id="full_name"
            name="full_name"
            className="field"
            autoComplete="name"
            placeholder="Sujata Maharjan"
          />
        </div>
      ) : null}

      <div>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="field"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="field"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
        />
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "One moment…" : submitLabel}
      </button>

      {error ? <FormError message={error} /> : null}
    </form>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="border-crimson bg-crimson-wash text-crimson-deep mt-3 rounded-lg border-2 px-3 py-2 text-sm font-medium"
    >
      {message}
    </p>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="bg-ink/15 h-px flex-1" />
      <span className="text-ink-faint text-xs font-bold tracking-widest uppercase">or</span>
      <span className="bg-ink/15 h-px flex-1" />
    </div>
  );
}

export function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44a5.4 5.4 0 0 1-2.39 3.58v3h3.86c2.26-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
