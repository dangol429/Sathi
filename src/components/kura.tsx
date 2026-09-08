"use client";

import { useEffect, useRef, useState } from "react";
import { VerifiedStamp } from "@/components/brand";
import { useMockAuth } from "@/components/mock-auth";
import { PersonAvatar, PersonName } from "@/components/person-link";
import { getConversations, markConversationRead, sendMessage as apiSendMessage } from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import { useSathis } from "@/lib/api/use-sathis";
import type { MockConversation } from "@/lib/feed-mock";

/* ===========================================================================
 * Kura — कुरा, "talk". Messages, in the corner.
 *
 * Deliberately the old Facebook/LinkedIn shape rather than a messages page.
 * The list is one panel; opening a conversation opens ANOTHER panel beside it,
 * and the list stays where it is. Several threads can be open at once, lined up
 * along the bottom of the screen, each closed on its own. Nothing navigates:
 * reading a message should not cost you the page you were on, and neither
 * should reading three.
 *
 * Two lists, and which one a thread is in is not stored anywhere:
 *
 *   Chats     the other person is one of your Sathis
 *   Requests  they are not, yet
 *
 * Anyone may message anyone — that is never blocked, and there is no "accept
 * this request" button. Replying to something in Requests is the whole of
 * accepting it. What being a Sathi changes is only which list it lands in, and
 * because that is derived rather than stored, accepting somebody's Sathi
 * request moves their thread across on its own.
 *
 * Signed-in only, on the same `signedIn` the composer, search and dhog use —
 * there is no such thing as a visitor's inbox.
 *
 * Everything here is local. Sending appends to a session store through lib/api
 * and reaches nobody, because there is no second browser for it to arrive in.
 * This is the one feature genuinely waiting on Realtime rather than on a plain
 * query, and getConversations / sendMessage are the two functions that become
 * a subscription and an insert.
 *
 * Every panel sits on --z-chat-widget: under modals, over everything else.
 * ========================================================================= */

type Tab = "chats" | "requests";

/** Panels open at once. Past this the oldest closes, as a dock has to end. */
const MAX_OPEN = 3;

/** One height for every panel, so their bottoms line up along the screen. */
const PANEL_H = "h-[min(calc(100dvh-6rem),max(50dvh,28rem))]";

export function Kura() {
  const { user, signedIn } = useMockAuth();
  const { sathiIds } = useSathis(user?.slug);

  const [listOpen, setListOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chats");
  /** Conversation ids with a panel open. Most recently opened last. */
  const [openIds, setOpenIds] = useState<string[]>([]);

  const {
    data: conversations,
    setData: setConversations,
    reload,
  } = useAsync<MockConversation[]>(getConversations, [], [signedIn]);

  if (!signedIn) return null;

  const isSathi = (slug: string) => sathiIds.includes(slug);
  const chats = conversations.filter((c) => isSathi(c.personSlug));
  const requests = conversations.filter((c) => !isSathi(c.personSlug));
  const unreadTotal = conversations.filter((c) => c.unread).length;
  const unreadRequests = requests.filter((c) => c.unread).length;

  const open = openIds
    .map((id) => conversations.find((c) => c.id === id))
    .filter((c): c is MockConversation => Boolean(c));

  function openThread(id: string) {
    setOpenIds((current) => {
      if (current.includes(id)) return current;
      return [...current, id].slice(-MAX_OPEN);
    });
    // Opening is what marks it read — not receiving it, and not hovering it.
    setConversations((current) => current.map((c) => (c.id === id ? { ...c, unread: false } : c)));
    void markConversationRead(id);
  }

  function closeThread(id: string) {
    setOpenIds((current) => current.filter((openId) => openId !== id));
  }

  async function send(id: string, content: string) {
    const optimistic = {
      id: `local-${Date.now()}`,
      fromMe: true as const,
      content,
      postedAt: "just now",
    };
    setConversations((current) =>
      current.map((c) => (c.id === id ? { ...c, messages: [...c.messages, optimistic] } : c)),
    );
    await apiSendMessage(id, content);
    reload();
  }

  return (
    /*
     * row-reverse so the list sits at the right-hand end and each newly opened
     * thread appears to its left, the way a dock fills up. items-end keeps the
     * collapsed bar sitting on the floor next to full-height panels.
     */
    <div className="z-chat-widget fixed right-4 bottom-0 flex max-w-[calc(100vw-2rem)] flex-row-reverse items-end gap-3 sm:right-6">
      {listOpen ? (
        <ListPanel
          className={PANEL_H}
          tab={tab}
          onTab={setTab}
          chats={chats}
          requests={requests}
          unreadRequests={unreadRequests}
          openIds={openIds}
          onOpen={openThread}
          onClose={() => setListOpen(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          aria-expanded={false}
          className="card hover:bg-elevated flex w-[21rem] max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-b-none px-4 py-2.5 text-left transition-colors"
        >
          <KuraGlyph />
          <span className="font-display font-semibold">Kura</span>
          {unreadTotal > 0 ? <UnreadBadge count={unreadTotal} /> : null}
          <ChevronGlyph className="text-ink-faint ml-auto h-4 w-4" />
        </button>
      )}

      {/*
       * Reversed again so the most recently opened thread sits nearest the
       * list. Panels past the first are dropped on narrow screens rather than
       * pushed off the edge — a dock that runs off the side is worse than a
       * short one.
       */}
      {[...open].reverse().map((conversation, index) => (
        <ConversationPanel
          key={conversation.id}
          className={`${PANEL_H} ${index === 0 ? "flex" : index === 1 ? "hidden md:flex" : "hidden xl:flex"}`}
          conversation={conversation}
          isSathi={isSathi(conversation.personSlug)}
          onClose={() => closeThread(conversation.id)}
          onSend={(text) => send(conversation.id, text)}
        />
      ))}
    </div>
  );
}

/* --- The list ------------------------------------------------------------ */

function ListPanel({
  className,
  tab,
  onTab,
  chats,
  requests,
  unreadRequests,
  openIds,
  onOpen,
  onClose,
}: {
  className: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  chats: MockConversation[];
  requests: MockConversation[];
  unreadRequests: number;
  openIds: string[];
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const shown = tab === "chats" ? chats : requests;

  return (
    <div
      className={`card mb-0 flex w-[21rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-b-none ${className}`}
    >
      <PanelHeader onClose={onClose} closeLabel="Close Kura">
        <KuraGlyph />
        <span className="font-display font-semibold">Kura</span>
      </PanelHeader>

      {/* Two lists, not a filter: a request is a different kind of thing from
          a conversation with somebody you already know. */}
      <div
        role="tablist"
        aria-label="Kura"
        className="border-line flex shrink-0 gap-1 border-b p-1.5"
      >
        <TabButton selected={tab === "chats"} onClick={() => onTab("chats")}>
          Chats
          <span className="text-ink-faint ml-1 text-xs tabular-nums">{chats.length}</span>
        </TabButton>
        <TabButton selected={tab === "requests"} onClick={() => onTab("requests")}>
          Requests
          {unreadRequests > 0 ? (
            <UnreadBadge count={unreadRequests} small />
          ) : (
            <span className="text-ink-faint ml-1 text-xs tabular-nums">{requests.length}</span>
          )}
        </TabButton>
      </div>

      {tab === "requests" ? (
        <p className="text-ink-faint border-line shrink-0 border-b px-3 py-2 text-[0.7rem] leading-relaxed">
          From people who aren&rsquo;t your Sathis yet. Replying is all it takes — there is nothing
          to accept.
        </p>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-ink-soft flex-1 p-4 text-sm">
          {tab === "chats" ? "No conversations with your Sathis yet." : "No message requests."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {shown.map((conversation) => (
            <li key={conversation.id}>
              <ConversationRow
                conversation={conversation}
                active={openIds.includes(conversation.id)}
                onOpen={() => onOpen(conversation.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink-faint border-line shrink-0 border-t px-3 py-2 text-[0.7rem]">
        Mock messages — nothing is delivered yet.
      </p>
    </div>
  );
}

/**
 * One row.
 *
 * The avatar is a link to the profile and the rest of the row opens the thread
 * — two different things to want, and a link inside a button is not valid
 * markup anyway. The name is a link too, in the panel the row opens.
 */
function ConversationRow({
  conversation,
  active,
  onOpen,
}: {
  conversation: MockConversation;
  active: boolean;
  onOpen: () => void;
}) {
  const last = conversation.messages[conversation.messages.length - 1];

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg p-2 transition-colors ${
        active ? "bg-elevated" : "hover:bg-elevated"
      }`}
    >
      <PersonAvatar name={conversation.person.name} size={36} />

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 cursor-pointer text-left"
        aria-label={`Open your conversation with ${conversation.person.name}`}
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`truncate text-sm ${conversation.unread ? "font-bold" : "font-semibold"}`}
          >
            {conversation.person.name}
          </span>
          {conversation.person.verified ? <VerifiedStamp size={12} /> : null}
          <span className="text-ink-faint ml-auto shrink-0 text-[0.7rem]">{last?.postedAt}</span>
        </span>
        <span
          className={`mt-0.5 block truncate text-xs ${
            conversation.unread ? "text-ink font-semibold" : "text-ink-soft"
          }`}
        >
          {last ? (last.fromMe ? `You: ${last.content}` : last.content) : ""}
        </span>
      </button>

      {/* A dot rather than a number: per conversation, the only thing worth
          saying is whether you have read it. */}
      {conversation.unread ? (
        <span className="bg-crimson mt-3 h-2 w-2 shrink-0 rounded-full" aria-label="Unread" />
      ) : null}
    </div>
  );
}

/* --- One thread, in its own panel ---------------------------------------- */

function ConversationPanel({
  className,
  conversation,
  isSathi,
  onClose,
  onSend,
}: {
  className: string;
  conversation: MockConversation;
  isSathi: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the conversation down as it grows, the way every messenger does.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.messages.length]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  const first = conversation.person.name.split(" ")[0];

  return (
    <div
      className={`card mb-0 w-[19rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-b-none ${className}`}
    >
      <PanelHeader
        onClose={onClose}
        closeLabel={`Close your conversation with ${conversation.person.name}`}
      >
        <PersonAvatar name={conversation.person.name} size={26} />
        {/* A link, not a label. Opening a chat with somebody must never be the
            thing that stops you looking at who they are. */}
        <PersonName name={conversation.person.name} className="truncate text-sm font-semibold" />
        {conversation.person.verified ? <VerifiedStamp size={12} /> : null}
      </PanelHeader>

      {!isSathi ? (
        <p className="text-ink-faint border-line shrink-0 border-b px-3 py-1.5 text-[0.7rem]">
          Not your Sathi yet — this sits in Requests.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                message.fromMe
                  ? "bg-crimson-wash text-ink border-crimson/30 rounded-br-sm border"
                  : "bg-elevated border-line-soft rounded-bl-sm border"
              }`}
            >
              <p className="prose-post">{message.content}</p>
              <p className="text-ink-faint mt-1 text-[0.65rem]">{message.postedAt}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-line flex shrink-0 items-end gap-2 border-t p-2.5">
        <input
          className="field field-search rounded-full pl-3.5"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={`Message ${first}…`}
          aria-label={`Message ${conversation.person.name}`}
        />
        <button
          type="submit"
          disabled={text.trim().length === 0}
          aria-label={`Send to ${conversation.person.name}`}
          className="btn btn-primary btn-sm shrink-0 rounded-full px-3"
        >
          <SendGlyph />
        </button>
      </form>
    </div>
  );
}

/* --- Pieces -------------------------------------------------------------- */

function PanelHeader({
  children,
  onClose,
  closeLabel,
}: {
  children: React.ReactNode;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <div className="border-line flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
      {children}
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="hover:bg-elevated text-ink-faint hover:text-ink ml-auto shrink-0 rounded-full p-1 transition-colors"
      >
        <CloseGlyph />
      </button>
    </div>
  );
}

function TabButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors ${
        selected ? "bg-selected text-on-selected" : "text-ink-soft hover:bg-elevated"
      }`}
    >
      {children}
    </button>
  );
}

function UnreadBadge({ count, small = false }: { count: number; small?: boolean }) {
  return (
    <span
      className={`bg-crimson text-on-accent ml-1 inline-flex items-center justify-center rounded-full font-bold tabular-nums ${
        small ? "h-4 min-w-4 px-1 text-[0.62rem]" : "h-5 min-w-5 px-1.5 text-[0.7rem]"
      }`}
      aria-label={`${count} unread`}
    >
      {count}
    </span>
  );
}

function KuraGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem] shrink-0" fill="none" aria-hidden>
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="m7 14 5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M4 12 20 4l-8 16-2.5-6.5L4 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
