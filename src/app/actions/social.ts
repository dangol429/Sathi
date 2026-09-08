"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import type { ActionState } from "@/app/actions/professional";

/**
 * "Helpful" is the only reaction, and it is deliberately a set/unset toggle
 * with no aggregate score anywhere. No karma table exists — see the schema.
 */
export async function toggleHelpful(postId: string, pathToRevalidate: string) {
  const viewer = await getViewer();
  if (!viewer) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("user_id", viewer.id)
    .eq("post_id", postId)
    .eq("type", "helpful")
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
  } else {
    await supabase.from("reactions").insert({ user_id: viewer.id, post_id: postId, type: "helpful" });
  }

  revalidatePath(pathToRevalidate);
}

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to join the thread." };

  const postId = String(formData.get("post_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!postId) return { error: "Missing post." };
  if (content.length < 2) return { error: "Say something first." };
  if (content.length > 4000) return { error: "That is over the 4,000 character limit." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: viewer.id, content });

  if (error) return { error: error.message };

  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

export async function toggleFollow(professionalId: string, pathToRevalidate: string) {
  const viewer = await getViewer();
  if (!viewer) return;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("follows")
    .select("professional_id")
    .eq("follower_id", viewer.id)
    .eq("professional_id", professionalId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", viewer.id)
      .eq("professional_id", professionalId);
  } else {
    await supabase
      .from("follows")
      .insert({ follower_id: viewer.id, professional_id: professionalId, created_at: new Date().toISOString() });
  }

  revalidatePath(pathToRevalidate);
}
