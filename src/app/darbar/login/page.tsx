import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ModeratorLogInForm } from "@/components/moderator-login-form";
import { isModerator } from "@/lib/moderator-auth";

export const metadata: Metadata = {
  title: "Darbar",
  // Internal. Keep it out of search results and out of link previews.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ModeratorLoginPage() {
  // Already in — no reason to show a login screen to somebody holding a
  // valid session, and it stops the back button landing on a dead form.
  if (await isModerator()) redirect("/darbar");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="eyebrow">Internal</p>
          <h1 className="font-display mt-2 text-4xl">Darbar</h1>
          <p className="text-ink-soft mt-2 text-sm">दरबार — the court. Moderation for Sathi.</p>
        </div>

        <div className="card mt-8 p-6">
          <ModeratorLogInForm />
        </div>

        <p className="text-ink-faint mt-6 text-center text-xs leading-relaxed">
          Nothing here is part of the public site. If you reached this page by accident, there is
          nothing for you on it.
        </p>
      </div>
    </div>
  );
}
