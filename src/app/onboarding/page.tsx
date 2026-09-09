import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Pennant } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { getActiveNiches } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Welcome in" };

/**
 * The one onboarding, for every account.
 *
 * Revisitable on purpose. Until there is a proper profile-edit screen, coming
 * back here is how someone adds the LinkedIn URL they skipped the first time.
 */
export default async function OnboardingPage() {
  const viewer = await requireViewer("/onboarding");

  const [niches, supabase] = await Promise.all([getActiveNiches(), createClient()]);

  /*
   * Unreachable in practice — requireViewer() above cannot return without a
   * session, and there are no sessions without a Supabase project. Handled
   * rather than asserted because the alternative is a non-null assertion, and
   * those are exactly what took the deployment down.
   */
  const [{ data: response }, { data: userNiches }] = supabase
    ? await Promise.all([
        supabase
          .from("onboarding_responses")
          .select("self_description, goals")
          .eq("user_id", viewer.id)
          .maybeSingle(),
        supabase.from("user_niches").select("niche_id").eq("user_id", viewer.id),
      ])
    : [{ data: null }, { data: null }];

  const firstName = viewer.fullName?.split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="mb-8 flex items-center gap-3">
        <Pennant className="h-9 w-auto" />
        <div>
          <p className="font-display text-lg leading-tight font-semibold">
            {firstName ? `Welcome, ${firstName}.` : "Welcome in."}
          </p>
          <p className="text-ink-soft text-sm">
            {viewer.onboarded
              ? "You have done this already — anything you change here just updates it."
              : "Three short steps and you are in."}
          </p>
        </div>
      </div>

      <OnboardingWizard
        niches={niches}
        profileId={viewer.id}
        defaults={{
          displayName: viewer.fullName ?? "",
          selfDescription: response?.self_description ?? null,
          goals: response?.goals ?? [],
          nicheIds: (userNiches ?? []).map((row) => row.niche_id),
          linkedinSubmitted: Boolean(viewer.profile),
        }}
      />
    </div>
  );
}
