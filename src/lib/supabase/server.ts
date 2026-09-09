import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_CONFIGURED, SUPABASE_URL } from "@/lib/supabase/env";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * **Returns null when there is no Supabase project configured.** The app ships
 * on mock data with no credentials set, and this is called on every render —
 * the root layout asks getViewer() for a session — so throwing here would 500
 * every page rather than degrade to "nobody is signed in". Callers are
 * expected to check, and TypeScript makes them.
 *
 * `setAll` throws when called from a Server Component (cookies are read-only
 * there). That is expected and safe to swallow: middleware refreshes the
 * session cookie on every request, so nothing is lost.
 */
export async function createClient() {
  if (!SUPABASE_CONFIGURED) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component render — middleware owns cookie writes.
        }
      },
    },
  });
}
