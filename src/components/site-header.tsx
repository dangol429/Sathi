import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { getViewer } from "@/lib/auth";
import { HeaderSession } from "@/components/header-auth";
import { PeopleSearch } from "@/components/people-search";
import { ThemeToggle } from "@/components/theme";

/**
 * The header, on every page.
 *
 * The admin and verification controls below are the only things that depend on
 * a real Supabase session; the avatar, the notification bell and the log-out
 * control all live in <HeaderSession />, which handles every signed-in state
 * there is. Keeping them together is deliberate — when they were split, the
 * bell existed in one branch and not the other.
 */
export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="border-line bg-paper/85 z-header sticky top-0 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Wordmark />

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {/* Not "Tech": tech is what happens to be open, not what the place
              is. The nav should not read as a single-niche product. */}
          <HeaderLink href="/feed">Feed</HeaderLink>
          <HeaderLink href="/#how-it-works">How it works</HeaderLink>
        </nav>

        {/* Takes the slack between the nav and the controls. Hidden on small
            screens, where there is no slack to take. */}
        <div className="ml-4 hidden max-w-xs min-w-0 flex-1 md:block">
          <PeopleSearch />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Outside the session cluster, so it is there whether or not you
              are signed in. */}
          <ThemeToggle />

          {viewer?.role === "admin" ? (
            <Link
              href="/admin/review"
              className="border-indigo text-indigo hidden rounded-full border-2 px-3 py-1 text-xs font-bold tracking-wider uppercase sm:inline-block"
            >
              Review queue
            </Link>
          ) : null}

          {viewer?.profile?.verification_status === "verified" ? (
            <Link href={`/space/${viewer.profile.id}`} className="btn btn-paper btn-sm">
              My space
            </Link>
          ) : null}

          {viewer?.profile?.verification_status === "pending" ? (
            <Link href="/pending" className="stamp stamp-pending">
              Under review
            </Link>
          ) : null}

          <HeaderSession
            viewer={
              viewer
                ? {
                    name: viewer.fullName ?? viewer.email ?? "?",
                    email: viewer.email,
                    avatarUrl: viewer.avatarUrl,
                  }
                : null
            }
          />
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="hover:bg-elevated rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
    >
      {children}
    </Link>
  );
}
