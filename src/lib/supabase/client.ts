"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_CONFIGURED, SUPABASE_URL } from "@/lib/supabase/env";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for the browser.
 *
 * **Returns null when there is no Supabase project configured**, like its
 * server counterpart. Nothing calls this on render — only the sign-in and
 * sign-up handlers do — so an unset variable here is a broken button rather
 * than a broken page, but a button that throws is still worse than one that
 * says why it cannot work.
 */
export function createClient() {
  if (!SUPABASE_CONFIGURED) return null;

  return createBrowserClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}
