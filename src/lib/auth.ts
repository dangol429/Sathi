import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfessionalProfileRow, UserRole } from "@/lib/database.types";

export type Viewer = {
  id: string;
  /** From the auth session — public.users.email is not readable by clients. */
  email: string | null;
  role: UserRole;
  fullName: string | null;
  avatarUrl: string | null;
  onboarded: boolean;
  /** Present as soon as a professional application has been submitted. */
  profile: ProfessionalProfileRow | null;
};

/**
 * The signed-in user, or null. Deduped per request so pages and layouts can
 * both call it without extra round trips.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase
      .from("users")
      .select("id, role, full_name, avatar_url, onboarded, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("professional_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    role: row?.role ?? "student",
    fullName:
      row?.full_name ??
      (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null),
    avatarUrl:
      row?.avatar_url ??
      (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null),
    onboarded: row?.onboarded ?? false,
    profile: profile ?? null,
  };
});

export async function requireViewer(nextPath: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return viewer;
}

export async function requireAdmin(nextPath: string): Promise<Viewer> {
  const viewer = await requireViewer(nextPath);
  if (viewer.role !== "admin") redirect("/?denied=admin");
  return viewer;
}

/**
 * Where a user belongs right after signing in. Single source of truth for the
 * post-auth redirect so the callback route and the pages cannot disagree.
 *
 * Verification is no longer a gate. Waiting on a LinkedIn review does not stop
 * anyone using the place — /pending is somewhere you can go to check, not
 * somewhere you get held.
 */
export function landingRouteFor(viewer: Viewer): string {
  if (viewer.role === "admin") return "/admin/review";

  // Everyone does the same onboarding, once.
  if (!viewer.onboarded) return "/onboarding";

  // Approved, but the page is still blank — finish it before the feed.
  const profile = viewer.profile;
  if (profile?.verification_status === "verified" && !profile.bio) {
    return "/onboarding/professional";
  }

  return "/feed?niche=tech";
}
