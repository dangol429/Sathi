"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import type { ProfileLink } from "@/lib/database.types";

export type ActionState = { error?: string; ok?: boolean };

function parseLinks(formData: FormData): ProfileLink[] {
  const labels = formData.getAll("link_label").map(String);
  const urls = formData.getAll("link_url").map(String);

  return urls
    .map((url, index) => ({ label: (labels[index] ?? "").trim(), url: url.trim() }))
    .filter((link) => link.url.length > 0)
    .slice(0, 6)
    .map((link) => {
      const url = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
      return { label: link.label || url.replace(/^https?:\/\//i, "").replace(/\/$/, ""), url };
    });
}

/**
 * After approval: the profile builder. Submitting a LinkedIn URL now happens
 * in onboarding — see app/actions/onboarding.ts.
 */
export async function saveProfessionalProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer?.profile) return { error: "No professional profile found for this account." };
  if (viewer.profile.verification_status !== "verified") {
    return { error: "Your profile is still under review." };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const nicheId = String(formData.get("niche_id") ?? "").trim();

  if (displayName.length < 2) return { error: "Your name cannot be empty." };
  if (bio.length < 40) {
    return { error: "Give people a little more to go on — 40 characters minimum." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("professional_profiles")
    .update({
      display_name: displayName,
      headline: headline || null,
      bio,
      niche_id: nicheId || null,
      links: parseLinks(formData),
    })
    .eq("id", viewer.profile.id);

  if (error) return { error: error.message };

  await supabase.from("users").update({ onboarded: true }).eq("id", viewer.id);

  revalidatePath("/", "layout");
  redirect("/onboarding/professional/first-post");
}

/** Step 4: the templated first post. */
export async function createFirstPost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return createPostInternal(formData, "intro");
}

export async function createPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return createPostInternal(formData, "post");
}

async function createPostInternal(
  formData: FormData,
  kind: "post" | "intro",
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer?.profile) return { error: "Only verified professionals can post." };

  const content = String(formData.get("content") ?? "").trim();
  if (content.length < 20) return { error: "That is a little short — say a bit more." };
  if (content.length > 8000) return { error: "That is over the 8,000 character limit." };

  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("id")
    .eq("professional_id", viewer.profile.id)
    .maybeSingle();

  if (!space) return { error: "Your space has not been created yet. Contact an admin." };

  const { error } = await supabase.from("posts").insert({
    space_id: space.id,
    author_id: viewer.id,
    content,
    kind,
  });

  if (error) return { error: error.message };

  // A new post shows up on the space, its niche page and the landing feed, so
  // revalidate the whole tree rather than naming each route.
  revalidatePath("/", "layout");

  if (kind === "intro") redirect(`/space/${viewer.profile.id}?welcome=1`);
  return { ok: true };
}
