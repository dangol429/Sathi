import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/* ===========================================================================
 * The moderator gate.
 *
 * Separate from lib/auth.ts on purpose. That file answers "who is this member
 * and what may they do", against Supabase. This one answers a single yes/no
 * about one operator, and it has to keep working on a deployment where
 * Supabase is not configured at all — which is exactly the deployment this
 * console is most useful on.
 *
 * WHAT THIS IS
 *   One shared username and password, checked on the server, exchanged for a
 *   signed httpOnly cookie. That is genuinely all.
 *
 * WHAT THIS IS NOT
 *   It is not per-person accounts, it has no audit trail of who did what, and
 *   one shared password cannot be revoked for one person. It is the right
 *   weight for a console guarding mock data during a prototype, and the wrong
 *   weight the day it guards real members' details. At that point the console
 *   should move behind lib/auth.ts and the `admin` role that already exists in
 *   the database — requireAdmin() in lib/auth.ts is the thing it becomes.
 *
 * The password still never reaches the browser: the check runs in a server
 * action and only the signed cookie goes back. And the cookie is an HMAC
 * rather than a flag, so it cannot be forged from devtools by anybody who has
 * not already got the password.
 * ========================================================================= */

const COOKIE = "sathi_moderator";
const SESSION_MS = 12 * 60 * 60 * 1000;

/**
 * Defaults are the ones this console was set up with, so it works on a fresh
 * clone with nothing configured. Set MODERATOR_ID / MODERATOR_PASSWORD in the
 * environment to change them without touching code — do that before this
 * guards anything real.
 */
const MODERATOR_ID = process.env.MODERATOR_ID ?? "prathamd";
const MODERATOR_PASSWORD = process.env.MODERATOR_PASSWORD ?? "12345";

/**
 * Signs the cookie. Falls back to deriving from the password so a missing
 * secret cannot silently produce an unsigned, forgeable session — changing the
 * password then invalidates every cookie signed under the old one, which is
 * the behaviour you want anyway.
 */
const SIGNING_SECRET =
  process.env.MODERATOR_SECRET ?? `sathi.moderator.${MODERATOR_ID}.${MODERATOR_PASSWORD}`;

function sign(issuedAt: string): string {
  return createHmac("sha256", SIGNING_SECRET).update(issuedAt).digest("hex");
}

/** Constant-time, and never throws on length mismatch the way the raw call does. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function credentialsMatch(id: string, password: string): boolean {
  // Both compared, both constant-time, and no early return between them, so a
  // wrong username and a wrong password are indistinguishable from outside.
  const idOk = safeEqual(id.trim(), MODERATOR_ID);
  const passwordOk = safeEqual(password, MODERATOR_PASSWORD);
  return idOk && passwordOk;
}

export function issueCookieValue(): string {
  const issuedAt = String(Date.now());
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS / 1000,
  };
}

export const MODERATOR_COOKIE = COOKIE;

function valueIsValid(value: string | undefined): boolean {
  if (!value) return false;
  const [issuedAt, signature] = value.split(".");
  if (!issuedAt || !signature) return false;
  if (!safeEqual(signature, sign(issuedAt))) return false;

  const age = Date.now() - Number(issuedAt);
  return Number.isFinite(age) && age >= 0 && age < SESSION_MS;
}

/** Is a moderator session present and still good? Never redirects. */
export async function isModerator(): Promise<boolean> {
  const store = await cookies();
  return valueIsValid(store.get(COOKIE)?.value);
}

/**
 * The gate every page under /darbar calls first.
 *
 * Deliberately called per page rather than only in the segment layout: in the
 * App Router a page component still executes even when its layout chooses not
 * to render the children, so a layout-only check would let a page's own work
 * run for somebody who is not signed in.
 */
export async function requireModerator(): Promise<void> {
  if (!(await isModerator())) redirect("/darbar/login");
}
