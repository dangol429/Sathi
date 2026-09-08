"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { normaliseLinkedIn } from "@/lib/linkedin";
import type { ActionState } from "@/app/actions/professional";
import type { OnboardingGoal, SelfDescription } from "@/lib/database.types";

/* ---------------------------------------------------------------------------
 * The one onboarding everybody does.
 *
 * The wizard holds steps 1 and 2 in the browser and submits them once, at the
 * end. Nothing here gates anything: the descriptor and the goals are
 * descriptive, the niche is a preference, the profile sections in step 3 are
 * optional, and LinkedIn is an offer rather than a requirement.
 *
 * The single thing that changes account state is a LinkedIn URL, and it does
 * exactly what the professional application used to do — inserts a
 * professional_profiles row as `pending` for a human to read. It cannot make
 * anyone verified; nothing in the client can.
 * ------------------------------------------------------------------------- */

const SELF_DESCRIPTIONS: SelfDescription[] = ["professional", "student", "looking"];
const GOALS: OnboardingGoal[] = ["answers", "share"];

export async function completeOnboarding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "You need to be signed in." };

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 2) return { error: "Please tell us the name you want shown." };

  const selfDescription = pick(formData.get("self_description"), SELF_DESCRIPTIONS);
  const goals = [...new Set(formData.getAll("goal").map(String))].filter(
    (goal): goal is OnboardingGoal => (GOALS as string[]).includes(goal),
  );

  const nicheIds = [...new Set(formData.getAll("niche_id").map(String).filter(Boolean))].slice(
    0,
    3,
  );

  const rawLinkedIn = String(formData.get("linkedin_url") ?? "").trim();
  const linkedin = rawLinkedIn ? normaliseLinkedIn(rawLinkedIn) : null;
  if (rawLinkedIn && !linkedin) {
    return {
      error:
        "That does not look like a LinkedIn profile URL. It should start with linkedin.com/in/",
    };
  }

  const supabase = await createClient();

  const { error: nameError } = await supabase
    .from("users")
    .update({ full_name: displayName })
    .eq("id", viewer.id);
  if (nameError) return { error: nameError.message };

  const { error: responseError } = await supabase.from("onboarding_responses").upsert(
    {
      user_id: viewer.id,
      self_description: selfDescription,
      goals,
      /*
       * Step 3 used to ask for a first post and these two columns held it. It
       * now offers the profile sections instead, which are rows of their own
       * and are written by the client as they are typed, so nothing arrives
       * here to record. The columns stay for the accounts that did answer.
       */
      first_action_kind: null,
      first_action_text: null,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (responseError) return { error: responseError.message };

  if (nicheIds.length > 0) {
    await supabase.from("user_niches").delete().eq("user_id", viewer.id);
    const { error: nicheError } = await supabase
      .from("user_niches")
      .insert(nicheIds.map((nicheId) => ({ user_id: viewer.id, niche_id: nicheId })));
    if (nicheError) return { error: nicheError.message };
  }

  // Same pending-review state the professional application always created.
  // Offered to everyone now, and skipping it costs nothing.
  if (linkedin && !viewer.profile) {
    const { error: profileError } = await supabase.from("professional_profiles").insert({
      user_id: viewer.id,
      display_name: displayName,
      linkedin_url: linkedin,
      niche_id: nicheIds[0] ?? null,
    });

    // A duplicate means they already have an application in flight, which is
    // not a reason to fail the rest of onboarding.
    if (profileError && profileError.code !== "23505") {
      return { error: profileError.message };
    }
  }

  const { error: onboardedError } = await supabase
    .from("users")
    .update({ onboarded: true })
    .eq("id", viewer.id);
  if (onboardedError) return { error: onboardedError.message };

  revalidatePath("/", "layout");
  redirect("/feed?niche=tech&welcome=1");
}

function pick<T extends string>(value: FormDataEntryValue | null, allowed: T[]): T | null {
  const raw = typeof value === "string" ? value : "";
  return (allowed as string[]).includes(raw) ? (raw as T) : null;
}
