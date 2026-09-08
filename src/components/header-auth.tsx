"use client";

import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { Avatar } from "@/components/avatar";
import { useMockAuth } from "@/components/mock-auth";
import { NotificationBell } from "@/components/notifications";
import { PopoverPanel, usePopover } from "@/components/popover";

/* ---------------------------------------------------------------------------
 * The right-hand end of the header.
 *
 * ONE session cluster, for every kind of signed-in state there is, and it draws
 * nothing at all unless `signedIn` says somebody is actually here. No session
 * means Log in / Join, full stop.
 *
 * Two bugs lived in the older shape of this, and both came from the same
 * thing — two session sources with no single answer between them:
 *
 *  - only the mock branch carried the notification bell, so anyone who had
 *    really signed up finished onboarding and landed on a feed with no bell;
 *  - "Log out" only ended the session it happened to be showing. With a real
 *    Supabase cookie underneath a mock session, logging out cleared the mock
 *    one and the header fell straight through to the real identity — an avatar
 *    that would not go away, belonging to somebody who had just pressed Log
 *    out and had no way left to press it again.
 *
 * So Log out now ends everything that is live: the mock session in state, and
 * the Supabase cookie via the server action. One control, one meaning.
 * ------------------------------------------------------------------------- */

/** Just enough of a real Supabase viewer to draw a header. */
export type HeaderViewer = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

export function HeaderSession({ viewer }: { viewer: HeaderViewer | null }) {
  const { user, signedIn, logOut, promptLogin } = useMockAuth();
  const { open, setOpen, close, anchorRef, triggerRef, panelId } = usePopover();

  /*
   * `signedIn` is the gate, not the presence of an identity object. The two can
   * only disagree if the provider and the header were handed different views of
   * the world, and if that ever happens the safe answer is the logged-out one.
   */
  const identity = !signedIn
    ? null
    : user
      ? { name: user.name, note: user.role, avatarUrl: user.avatarUrl ?? null }
      : viewer
        ? { name: viewer.name, note: viewer.email ?? "", avatarUrl: viewer.avatarUrl }
        : null;

  if (!identity) {
    return (
      <>
        {/* A modal, not a route: logging in should not take you off the page
            you were reading. The modal itself is mounted in the layout. */}
        <button type="button" onClick={promptLogin} className="btn btn-ghost btn-sm">
          Log in
        </button>
        <Link href="/signup" className="btn btn-primary btn-sm">
          Join
        </Link>
      </>
    );
  }

  return (
    <>
      <NotificationBell />

      <div className="relative" ref={anchorRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={`Account menu for ${identity.name}`}
          className="hover:ring-ink/20 rounded-full transition-shadow hover:ring-4"
        >
          <Avatar name={identity.name} src={identity.avatarUrl} size={32} />
        </button>

        {open ? (
          <PopoverPanel id={panelId} align="right" className="w-48">
            <div role="menu" aria-label="Account">
              <p className="border-line mb-1 border-b px-2.5 pt-1 pb-2">
                <span className="block truncate text-sm font-semibold">{identity.name}</span>
                {identity.note ? (
                  <span className="text-ink-faint block truncate text-xs">{identity.note}</span>
                ) : null}
              </p>

              <MenuLink href="/profile" onNavigate={() => close()}>
                View profile
              </MenuLink>
              <MenuLink href="/settings" onNavigate={() => close()}>
                Settings
              </MenuLink>

              {/*
               * A real session is a cookie and only the server can clear it, so
               * when there is one this is a form posting the sign-out action.
               * The onClick drops the mock session on the way out, so neither
               * can outlive the other.
               */}
              {viewer ? (
                <form action={signOut}>
                  <button
                    type="submit"
                    role="menuitem"
                    onClick={() => logOut()}
                    className="hover:bg-elevated block w-full rounded-md px-2.5 py-1.5 text-left text-sm font-semibold transition-colors"
                  >
                    Log out
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    logOut();
                    close();
                  }}
                  className="hover:bg-elevated block w-full rounded-md px-2.5 py-1.5 text-left text-sm font-semibold transition-colors"
                >
                  Log out
                </button>
              )}
            </div>
          </PopoverPanel>
        ) : null}
      </div>
    </>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="hover:bg-elevated block rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors"
    >
      {children}
    </Link>
  );
}
