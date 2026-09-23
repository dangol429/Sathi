"use client";

import { useActionState } from "react";
import { moderatorLogIn } from "@/app/actions/moderator";
import { FormError } from "@/components/auth-forms";
import type { ActionState } from "@/app/actions/professional";

/**
 * Deliberately the plainest form on the site: two fields and a button, no
 * Google, no sign-up link, no "forgot password". There is one operator and
 * they either know the login or they do not belong here.
 */
export function ModeratorLogInForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(moderatorLogIn, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="moderator_id">
          Moderator ID
        </label>
        <input
          id="moderator_id"
          name="moderator_id"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          className="field"
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
          autoComplete="current-password"
          className="field"
        />
      </div>

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Checking…" : "Enter"}
      </button>

      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}
