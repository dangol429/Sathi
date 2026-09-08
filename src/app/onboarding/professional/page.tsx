import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Garland, VerifiedStamp } from "@/components/brand";
import { ProfileBuilderForm } from "@/components/profile-builder-form";
import { requireViewer } from "@/lib/auth";
import { getActiveNiches } from "@/lib/queries";
import { parseProfileLinks } from "@/lib/database.types";

export const metadata: Metadata = { title: "Build your profile" };

export default async function ProfileBuilderPage() {
  const viewer = await requireViewer("/onboarding/professional");
  const profile = viewer.profile;

  if (!profile) redirect("/onboarding");
  if (profile.verification_status !== "verified") redirect("/pending");

  const niches = await getActiveNiches();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="card overflow-hidden p-0">
        <div className="lattice px-7 py-7 sm:px-9">
          <div className="flex flex-wrap items-center gap-3">
            <VerifiedStamp founding={profile.founding_member} />
            <p className="eyebrow">Step 1 of 2</p>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl">You&rsquo;re in. Now fill in the page.</h1>
          <p className="text-ink-soft mt-2 max-w-xl leading-relaxed">
            Someone read your LinkedIn and approved you
            {profile.founding_member ? (
              <>
                {" "}
                — and because you are in the first cohort, the{" "}
                <strong className="text-ink font-semibold">founding member</strong> mark stays on
                your page permanently.
              </>
            ) : (
              "."
            )}
          </p>
        </div>

        <Garland />

        <div className="p-7 sm:p-9">
          <ProfileBuilderForm
            niches={niches}
            defaults={{
              displayName: profile.display_name,
              headline: profile.headline ?? "",
              bio: profile.bio ?? "",
              nicheId: profile.niche_id,
              links: parseProfileLinks(profile.links),
            }}
          />
        </div>
      </div>
    </div>
  );
}
