"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import type { ActionState } from "@/app/actions/professional";

/**
 * Manual review. Both of these call SECURITY DEFINER functions that re-check
 * `is_admin()` in the database, so the check below is a courtesy for the UI —
 * not the thing keeping non-admins out.
 */
export async function approveProfessional(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return { error: "Not authorised." };

  const profileId = String(formData.get("profile_id") ?? "");
  if (!profileId) return { error: "Missing profile." };

  const supabase = await createClient();
  // No Supabase project configured on this deployment.
  if (!supabase) return { error: "Accounts are not set up on this deployment yet." };
  // No Supabase project configured on this deployment.
  if (!supabase) return { error: "Accounts are not set up on this deployment yet." };
  const { error } = await supabase.rpc("approve_professional", { p_profile_id: profileId });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rejectProfessional(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return { error: "Not authorised." };

  const profileId = String(formData.get("profile_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!profileId) return { error: "Missing profile." };

  const supabase = await createClient();
  // No Supabase project configured on this deployment.
  if (!supabase) return { error: "Accounts are not set up on this deployment yet." };
  // No Supabase project configured on this deployment.
  if (!supabase) return { error: "Accounts are not set up on this deployment yet." };
  const { error } = await supabase.rpc("reject_professional", {
    p_profile_id: profileId,
    p_note: note || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/review");
  return { ok: true };
}
