"use client";

import { useState } from "react";
import { PopoverPanel, usePopover } from "@/components/popover";
import { acceptSathiRequest, declineSathiRequest, getNotifications } from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import type { MockNotification } from "@/lib/feed-mock";

/**
 * The bell, and what is behind it.
 *
 * Built out of markup like the Show/Sort dropdowns, for the same reason: a
 * native popup would come with the operating system's own colours and ignore
 * the theme. The panel is absolutely positioned, so opening it lays it over
 * the page rather than growing the header.
 *
 * Most lines are just text. A Sathi request is not: it is a question, and the
 * bell is where it gets answered, with Accept and Decline in the row itself.
 * Sending someone off to a separate page to press one of two buttons would be
 * a page that exists only to hold two buttons.
 *
 * Answering one writes through lib/api, which notifies every other surface
 * that cares — the button on their profile, which Kura list their thread sits
 * in, the feed's Sathis filter, and both Sathi counts.
 *
 * MOCK: hardcoded lines written for the signed-in user. Nothing generates
 * them, opening the panel marks them read for as long as the tab is open, and
 * nothing is stored.
 */
export function NotificationBell() {
  const { open, setOpen, close, anchorRef, triggerRef, panelId } = usePopover();
  const [read, setRead] = useState(false);
  const { data: notifications, setData: setNotifications } = useAsync<MockNotification[]>(
    getNotifications,
    [],
  );
  /** Sathi requests answered in this session, and what was decided. */
  const [answered, setAnswered] = useState<Record<string, "accepted" | "declined">>({});

  const unread = read ? 0 : notifications.filter((n) => n.unread).length;

  function answer(notification: MockNotification, accept: boolean) {
    const slug = notification.personSlug;
    if (!slug) return;
    setAnswered((current) => ({ ...current, [notification.id]: accept ? "accepted" : "declined" }));
    setNotifications((current) =>
      current.map((n) => (n.id === notification.id ? { ...n, unread: false } : n)),
    );
    void (accept ? acceptSathiRequest(slug) : declineSathiRequest(slug));
  }

  function toggle() {
    if (!open) setRead(true);
    setOpen(!open);
  }

  return (
    <div className="relative" ref={anchorRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        className="hover:bg-elevated text-ink-soft hover:text-ink relative rounded-full p-2 transition-colors"
      >
        <BellGlyph />
        {unread > 0 ? (
          <span
            className="bg-crimson absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
            aria-hidden
          />
        ) : null}
      </button>

      {open ? (
        <PopoverPanel id={panelId} align="right" className="w-80 max-w-[calc(100vw-2rem)]">
          <div className="border-line flex items-center justify-between border-b px-2.5 pb-2 pt-1">
            <p className="text-sm font-semibold">Notifications</p>
            <span className="chip text-ink-faint border-dashed text-[0.6rem] tracking-[0.12em] uppercase">
              Mock
            </span>
          </div>

          <ul className="mt-1">
            {notifications.map((notification) =>
              notification.kind === "sathi-request" ? (
                <li key={notification.id}>
                  <SathiRequestRow
                    notification={notification}
                    decided={answered[notification.id]}
                    onAnswer={(accept) => answer(notification, accept)}
                  />
                </li>
              ) : (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => close(true)}
                    className="hover:bg-elevated flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        notification.unread ? "bg-crimson" : "bg-transparent"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="text-ink block text-sm leading-snug">
                        {notification.text}
                      </span>
                      <span className="text-ink-faint mt-0.5 block text-xs">
                        {notification.postedAt}
                      </span>
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>

          <p className="text-ink-faint border-line mt-1 border-t px-2.5 pt-2 pb-1 text-xs">
            Nothing here is wired up yet.
          </p>
        </PopoverPanel>
      ) : null}
    </div>
  );
}

/**
 * A Sathi request, answerable where it is read.
 *
 * It stays in the list after being answered, saying what happened, rather than
 * vanishing under the cursor — a row that disappears the instant you press it
 * leaves you unsure which button you actually hit.
 */
function SathiRequestRow({
  notification,
  decided,
  onAnswer,
}: {
  notification: MockNotification;
  decided?: "accepted" | "declined";
  onAnswer: (accept: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg px-2.5 py-2">
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          notification.unread && !decided ? "bg-crimson" : "bg-transparent"
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink text-sm leading-snug">{notification.text}</p>
        <p className="text-ink-faint mt-0.5 text-xs">{notification.postedAt}</p>

        {decided ? (
          <p className="text-ink-soft mt-1.5 text-xs font-semibold" role="status">
            {decided === "accepted" ? "You’re now Sathis." : "Request declined."}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => onAnswer(true)} className="btn btn-primary btn-sm">
              Accept
            </button>
            <button type="button" onClick={() => onAnswer(false)} className="btn btn-paper btn-sm">
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BellGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" aria-hidden>
      <path
        d="M18 15.5V10a6 6 0 1 0-12 0v5.5L4.5 18h15L18 15.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 20.5a2.2 2.2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
