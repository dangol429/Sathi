"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  MODERATOR_COOKIE,
  cookieOptions,
  credentialsMatch,
  issueCookieValue,
} from "@/lib/moderator-auth";
import type { ActionState } from "@/app/actions/professional";

/**
 * Signing in to the console.
 *
 * The check happens here, on the server, so the password is never part of the
 * client bundle — a console whose password ships to every visitor's browser
 * would be a decoration rather than a gate.
 */
export async function moderatorLogIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("moderator_id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!id || !password) return { error: "Both fields are needed." };

  if (!credentialsMatch(id, password)) {
    // One message for both, so this cannot be used to find out which half was
    // right and narrow the guessing down to the other.
    return { error: "That is not a moderator login." };
  }

  const store = await cookies();
  store.set(MODERATOR_COOKIE, issueCookieValue(), cookieOptions());

  redirect("/darbar");
}

export async function moderatorLogOut(): Promise<void> {
  const store = await cookies();
  store.delete(MODERATOR_COOKIE);
  redirect("/darbar/login");
}
