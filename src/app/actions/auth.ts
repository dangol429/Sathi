"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  // No Supabase project configured on this deployment.
  if (!supabase) return redirect("/");
  // No Supabase project configured on this deployment.
  if (!supabase) return redirect("/");
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
