import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FirstPostForm } from "@/components/first-post-form";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Your first post" };

export default async function FirstPostPage() {
  const viewer = await requireViewer("/onboarding/professional/first-post");
  const profile = viewer.profile;

  if (!profile) redirect("/onboarding");
  if (profile.verification_status !== "verified") redirect("/pending");

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow">Step 2 of 2</p>
      <h1 className="mt-3 text-4xl sm:text-[2.75rem]">Say the first thing.</h1>
      <p className="text-ink-soft mt-3 max-w-xl text-lg leading-relaxed">
        An empty space gets no questions. One honest post is enough to start.
      </p>

      <div className="card mt-8 p-6 sm:p-8">
        <FirstPostForm displayName={profile.display_name} />
      </div>

      <p className="text-ink-faint mt-6 text-sm">
        Would rather do this later?{" "}
        <Link href={`/space/${profile.id}`} className="link-ink font-semibold">
          Skip to your space
        </Link>{" "}
        — the prompt will still be there.
      </p>
    </div>
  );
}
