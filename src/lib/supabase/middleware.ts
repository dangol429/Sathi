import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_CONFIGURED, SUPABASE_URL } from "@/lib/supabase/env";
import type { Database } from "@/lib/database.types";

/** Routes that need a signed-in user. Role checks happen in the pages. */
const PROTECTED_PREFIXES = ["/admin", "/onboarding", "/pending", "/account"];

export async function updateSession(request: NextRequest) {
  /*
   * No credentials, no session to refresh — step aside.
   *
   * This runs before every request in the whole app, so it is the one place
   * where throwing takes the entire site down rather than one route. Building
   * the client with unset variables did exactly that: every request returned
   * MIDDLEWARE_INVOCATION_FAILED, including the pages that need no Supabase at
   * all because they run on mock data.
   *
   * Nothing is lost by skipping. There is no cookie to refresh, and the
   * protected routes below still guard themselves — every one of them calls
   * requireViewer() or requireAdmin(), which redirect on a null viewer. The
   * middleware check is a fast path, not the lock.
   */
  if (!SUPABASE_CONFIGURED) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not remove: this refreshes the auth token and is what keeps the
  // Server Component clients in sync.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
