import type { Metadata } from "next";
import Link from "next/link";
import { moderatorLogOut } from "@/app/actions/moderator";
import { ModeratorConsole } from "@/components/moderator-console";
import { requireModerator } from "@/lib/moderator-auth";

export const metadata: Metadata = {
  title: "Darbar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DarbarPage() {
  await requireModerator();

  return (
    <div className="min-h-dvh">
      {/* The console's own bar. The site header is hidden on these routes —
          this is not the site, and dressing it as the site would make it far
          too easy to forget which one you are looking at. */}
      <header className="border-line bg-snow border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow">Internal · moderators only</p>
            <h1 className="font-display mt-0.5 text-2xl leading-none">Darbar</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/feed" className="btn btn-paper btn-sm">
              Back to Sathi
            </Link>
            <form action={moderatorLogOut}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <ModeratorConsole />
    </div>
  );
}
