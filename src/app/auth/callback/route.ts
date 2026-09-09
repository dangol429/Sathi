import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer, landingRouteFor } from "@/lib/auth";

/**
 * OAuth / magic-link landing point.
 *
 * `next` carries the intent through the round trip to Google — that is how we
 * know whether someone came in through the student door or the professional
 * one, since we cannot trust OAuth metadata for it.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Missing auth code")}`,
    );
  }

  const supabase = await createClient();
  // No Supabase project configured: there is no session to exchange for.
  if (!supabase) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Accounts are not set up on this deployment yet.")}`,
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Only ever redirect to our own relative paths.
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const viewer = await getViewer();
  return NextResponse.redirect(`${origin}${viewer ? landingRouteFor(viewer) : "/"}`);
}
