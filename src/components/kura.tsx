"use client";

import { useEffect, useRef, useState } from "react";
import { VerifiedStamp } from "@/components/brand";
import { KuraBackdrop } from "@/components/kura-backdrop";
import { MessageActions } from "@/components/message-actions";
import { useMockAuth } from "@/components/mock-auth";
import { PersonAvatar, PersonName } from "@/components/person-link";
import {
  deleteMessage as apiDeleteMessage,
  editMessage as apiEditMessage,
  getConversations,
  markConversationRead,
  sendMessage as apiSendMessage,
} from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import { useSathis } from "@/lib/api/use-sathis";
import { editWindowRemaining } from "@/lib/edit-window";
import type { MockConversation, MockMessage } from "@/lib/feed-mock";

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
 *
 * A message you sent carries the same edit/delete rights a post does, gated
 * the same way: Delete always, Edit only for fifteen minutes
 * (lib/edit-window.ts, shared with PostActions). Long enough to fix a typo,
 * short enough that a reply already sent in answer to it cannot be rewritten
 * underneath — while taking your own words back stays available, because that
 * is not something that should expire.
 *
 * A time sits beside every message, always, rather than only on hover or
 * tucked inside the bubble: on the side nearer the panel's centre, so it never
 * crowds the panel's outer edge. Only your own messages are clickable — there
 * is nothing to offer on one you did not send, so those stay plain text with a
 * time beside them and nothing more.
 * ========================================================================= */

type Tab = "chats" | "requests";

/** Panels open at once. Past this the oldest closes, as a dock has to end. */
const MAX_OPEN = 3;

/** One height for every panel, so their bottoms line up along the screen. */
const PANEL_H = "h-[min(calc(100dvh-6rem),max(50dvh,28rem))]";

/**
 * Expanded: twice the width and twice the height.
 *
 * The height keeps the same `min(calc(100dvh-6rem), …)` clamp, so "twice as
 * tall" means twice as tall until it would run off the top of the screen and
 * then simply as tall as the screen allows. A panel that grew past the
 * viewport would put its own composer out of reach, which is a strange reward
 * for pressing Expand.
 */
const PANEL_W = "w-[19rem]";
const PANEL_W_BIG = "w-[38rem]";
const PANEL_H_BIG = "h-[min(calc(100dvh-6rem),max(100dvh,56rem))]";

/** The list is wider than a thread to begin with, and doubles the same way. */
const LIST_W = "w-[21rem]";
const LIST_W_BIG = "w-[42rem]";

export function Kura() {
  const { user, signedIn } = useMockAuth();
  const { sathiIds } = useSathis(user?.slug);

  const [listOpen, setListOpen] = useState(false);
  /** Kept across closing and reopening the list — unlike a thread, there is
      only one of it, so a size you chose is a preference rather than state
      belonging to some particular conversation. */
  const [listExpanded, setListExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("chats");
  /** Conversation ids with a panel open. Most recently opened last. */
  const [openIds, setOpenIds] = useState<string[]>([]);
  /** Open, but folded down to their header bar. */
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  /** Open, and drawn at twice the size. */
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

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
    // Leave nothing behind: reopening the thread later should not restore the
    // folded-away or enlarged state it happened to be in when it was closed.
    setCollapsedIds((current) => current.filter((openId) => openId !== id));
    setExpandedIds((current) => current.filter((openId) => openId !== id));
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      // Unfold on the way out: expanding a panel you cannot see is a no-op the
      // user would have to undo twice.
      setCollapsedIds((folded) => folded.filter((x) => x !== id));
      return [...current, id];
    });
  }

  async function send(id: string, content: string) {
    const optimistic: MockMessage = {
      id: `local-${Date.now()}`,
      fromMe: true,
      content,
      postedAt: "just now",
      createdAt: Date.now(),
      // Cleared the instant reload() below replaces this with the store's own
      // copy — see MockMessage.sending for why editing/deleting has to wait
      // for that to happen rather than trusting this optimistic stand-in.
      sending: true,
    };
    setConversations((current) =>
      current.map((c) => (c.id === id ? { ...c, messages: [...c.messages, optimistic] } : c)),
    );
    await apiSendMessage(id, content);
    reload();
  }

  function editMessageIn(conversationId: string, messageId: string, content: string) {
    setConversations((current) =>
      current.map((c) =>
        c.id !== conversationId
          ? c
          : {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, content, editedAt: true } : m,
              ),
            },
      ),
    );
    void apiEditMessage(conversationId, messageId, content);
  }

  function deleteMessageIn(conversationId: string, messageId: string) {
    setConversations((current) =>
      current.map((c) =>
        c.id !== conversationId
          ? c
          : { ...c, messages: c.messages.filter((m) => m.id !== messageId) },
      ),
    );
    void apiDeleteMessage(conversationId, messageId).then(reload);
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
          expanded={listExpanded}
          onToggleExpand={() => setListExpanded((current) => !current)}
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
          className={index === 0 ? "flex" : index === 1 ? "hidden md:flex" : "hidden xl:flex"}
          conversation={conversation}
          isSathi={isSathi(conversation.personSlug)}
          collapsed={collapsedIds.includes(conversation.id)}
          expanded={expandedIds.includes(conversation.id)}
          onToggleCollapse={() => toggleCollapsed(conversation.id)}
          onToggleExpand={() => toggleExpanded(conversation.id)}
          onClose={() => closeThread(conversation.id)}
          onSend={(text) => send(conversation.id, text)}
          onEditMessage={(messageId, content) => editMessageIn(conversation.id, messageId, content)}
          onDeleteMessage={(messageId) => deleteMessageIn(conversation.id, messageId)}
        />
      ))}
    </div>
  );
}

/* --- The list ------------------------------------------------------------ */

function ListPanel({
  expanded,
  onToggleExpand,
  tab,
  onTab,
  chats,
  requests,
  unreadRequests,
  openIds,
  onOpen,
  onClose,
}: {
  expanded: boolean;
  onToggleExpand: () => void;
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
      className={`card mb-0 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-b-none ${
        expanded ? LIST_W_BIG : LIST_W
      } ${expanded ? PANEL_H_BIG : PANEL_H}`}
    >
      {/* The list has one collapsed state, not two: folding it down and
          closing it both leave the same bar sitting on the floor, so the
          chevron and the cross are wired to the same thing rather than
          pretending to be different. */}
      <PanelHeader
        collapsed={false}
        onToggleCollapse={onClose}
        collapseLabel="Hide Kura"
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        expandLabel={expanded ? "Shrink Kura" : "Expand Kura"}
        onClose={onClose}
        closeLabel="Close Kura"
      >
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
  collapsed,
  expanded,
  onToggleCollapse,
  onToggleExpand,
  onClose,
  onSend,
  onEditMessage,
  onDeleteMessage,
}: {
  /** Only which screen sizes this panel appears on. Its own size is its own. */
  className: string;
  conversation: MockConversation;
  isSathi: boolean;
  collapsed: boolean;
  expanded: boolean;
  onToggleCollapse: () => void;
  onToggleExpand: () => void;
  onClose: () => void;
  onSend: (text: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
}) {
  const [text, setText] = useState("");
  /** At most one message editable at a time — starting a second discards the first. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the conversation down as it grows, the way every messenger does.
  // `collapsed` is in here too: unfolding a panel should land you at the
  // bottom of the thread, not wherever it happened to be when you folded it.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.messages.length, collapsed]);

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
      className={`card mb-0 flex-col overflow-hidden rounded-b-none max-w-[calc(100vw-2rem)] ${
        expanded ? PANEL_W_BIG : PANEL_W
      } ${collapsed ? "" : expanded ? PANEL_H_BIG : PANEL_H} ${className}`}
    >
      <PanelHeader
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        collapseLabel={
          collapsed
            ? `Open your conversation with ${conversation.person.name}`
            : `Hide your conversation with ${conversation.person.name}`
        }
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        expandLabel={expanded ? "Shrink this conversation" : "Expand this conversation"}
        onClose={onClose}
        closeLabel={`Close your conversation with ${conversation.person.name}`}
      >
        <PersonAvatar name={conversation.person.name} size={26} />
        {/* A link, not a label. Opening a chat with somebody must never be the
            thing that stops you looking at who they are. */}
        <PersonName name={conversation.person.name} className="truncate text-sm font-semibold" />
        {conversation.person.verified ? <VerifiedStamp size={12} /> : null}
      </PanelHeader>

      {/* Folded down to the bar. The thread is still open and still in the
          dock — nothing about it is unmounted, so a half-typed message and the
          scroll position both survive being folded away. */}
      {collapsed ? null : (
        <>
          {!isSathi ? (
            <p className="text-ink-faint border-line shrink-0 border-b px-3 py-1.5 text-[0.7rem]">
              Not your Sathi yet — this sits in Requests.
            </p>
          ) : null}

          {/*
           * Two boxes, not one. The outer box is the positioning context and
           * holds the wallpaper; the scroller is a separate absolute layer
           * inside it. If the backdrop lived in the scroller it would scroll
           * away with the messages after one screenful — the wallpaper has to
           * stay still while the conversation moves over it.
           *
           * The scroller comes after the backdrop in the DOM and so paints on
           * top of it without either needing a z-index. The global scale is
           * for things that stack across the app; this is two siblings in one
           * panel, and document order is enough.
           */}
          <div className="relative min-h-0 flex-1">
            <KuraBackdrop />

            <div className="absolute inset-0 space-y-2 overflow-y-auto p-3">
              {conversation.messages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  editing={editingId === message.id}
                  onStartEdit={() => setEditingId(message.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(content) => {
                    onEditMessage(message.id, content);
                    setEditingId(null);
                  }}
                  onDelete={() => onDeleteMessage(message.id)}
                />
              ))}
              <div ref={endRef} />
            </div>
          </div>

          <form
            onSubmit={submit}
            className="border-line flex shrink-0 items-end gap-2 border-t p-2.5"
          >
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
        </>
      )}
    </div>
  );
}

/* --- One message ----------------------------------------------------------
 *
 * Three states: plain (the common case), editing (an inline form replacing
 * the bubble's content, in place), and — only for your own messages, only
 * inside the window — clickable, opening MessageActions.
 *
 * The time sits in its own span OUTSIDE the bubble rather than inside it, in
 * a small flex cluster with the bubble. `flex-row-reverse` on your own
 * (right-aligned) messages puts that span before the bubble in the DOM but
 * after it visually — i.e. to its LEFT — while a received message keeps the
 * natural order and the time lands to the bubble's right. Either way the time
 * ends up on the side nearer the panel's centre, never against the panel's
 * outer edge where a narrow 19rem panel would make it feel cramped.
 * ------------------------------------------------------------------------- */

function MessageRow({
  message,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  message: MockMessage;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (content: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(message.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [remaining, setRemaining] = useState(() =>
    editWindowRemaining(message.createdAt, Date.now()),
  );

  // Reset the draft whenever editing starts fresh, rather than carrying
  // forward whatever was left over from a previous, cancelled attempt.
  useEffect(() => {
    if (editing) setDraft(message.content);
  }, [editing, message.content]);

  // Re-check right when the window is due to close, so Edit drops out of the
  // menu on its own rather than lingering until some unrelated render — the
  // same self-correcting timer PostActions uses for posts.
  useEffect(() => {
    if (!message.fromMe || remaining <= 0) return;
    const id = setTimeout(
      () => setRemaining(editWindowRemaining(message.createdAt, Date.now())),
      remaining,
    );
    return () => clearTimeout(id);
  }, [message.fromMe, message.createdAt, remaining]);

  // Not yet confirmed by the store — see MockMessage.sending. Acting on it now
  // could race with the reload that follows a send and bring it back.
  const settled = !message.sending;
  /* Your own settled message always has a menu, because Delete never expires.
     Only Edit inside it is windowed. */
  const canOpenMenu = message.fromMe && settled;
  const canEdit = canOpenMenu && remaining > 0;

  if (editing) {
    return (
      <div className="flex justify-end">
        <div className="border-crimson/30 bg-crimson-wash w-[85%] rounded-2xl rounded-br-sm border px-3 py-2">
          <textarea
            className="field min-h-14 w-full resize-y bg-transparent px-0 py-0 text-sm leading-relaxed"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Edit your message"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={draft.trim().length === 0}
              onClick={() => onSave(draft.trim())}
              className="btn btn-primary btn-sm"
            >
              Save
            </button>
            <button type="button" onClick={onCancelEdit} className="btn btn-ghost btn-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[85%] items-end gap-1.5 ${message.fromMe ? "flex-row-reverse" : ""}`}
      >
        <div
          ref={bubbleRef}
          {...(canOpenMenu
            ? {
                role: "button" as const,
                tabIndex: 0,
                onClick: () => setMenuOpen((current) => !current),
                onKeyDown: (event: React.KeyboardEvent) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setMenuOpen((current) => !current);
                  }
                },
                "aria-haspopup": "menu" as const,
                "aria-expanded": menuOpen,
                "aria-label": "Message actions",
              }
            : {})}
          className={`min-w-0 rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            message.fromMe
              ? "bg-crimson-wash text-ink border-crimson/30 rounded-br-sm border"
              : "bg-elevated border-line-soft rounded-bl-sm border"
          } ${canOpenMenu ? "cursor-pointer transition-opacity hover:opacity-90" : ""}`}
        >
          <p className="prose-post">{message.content}</p>
        </div>

        <span className="text-ink-faint shrink-0 pb-1 text-[0.65rem] whitespace-nowrap">
          {message.postedAt}
          {message.editedAt ? " · edited" : null}
        </span>
      </div>

      {menuOpen ? (
        <MessageActions
          anchorRef={bubbleRef}
          canEdit={canEdit}
          onClose={(returnFocus) => {
            setMenuOpen(false);
            if (returnFocus) bubbleRef.current?.focus();
          }}
          onEdit={onStartEdit}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  );
}

/* --- Pieces -------------------------------------------------------------- */

/**
 * The bar across the top of every panel, and the only place a panel is
 * operated from.
 *
 * Three different things can happen up here and they are deliberately not the
 * same thing:
 *
 *   collapse   fold the panel down to this bar, keeping the thread open. The
 *              conversation is still there, you are just not looking at it.
 *   expand     make the panel twice the size, for a thread you are actually
 *              reading rather than glancing at.
 *   close      take the thread out of the dock entirely.
 *
 * The bar itself collapses on click, which is how every desktop messenger has
 * worked for fifteen years and the thing people try first. It is a div rather
 * than a button because it contains a link (the person's name) and two
 * buttons, and interactive elements do not nest — so the handler ignores any
 * click that started on a control of its own and lets that control act. The
 * chevron is there so the same thing is reachable by keyboard and announced
 * properly, rather than being a gesture only a mouse can find.
 */
function PanelHeader({
  children,
  collapsed,
  onToggleCollapse,
  collapseLabel,
  expanded,
  onToggleExpand,
  expandLabel,
  onClose,
  closeLabel,
}: {
  children: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  collapseLabel: string;
  /** Omitted by the list panel, which has nothing to enlarge. */
  expanded?: boolean;
  onToggleExpand?: () => void;
  expandLabel?: string;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <div
      onClick={(event) => {
        // A click that began on the name link or one of the buttons belongs to
        // that control, not to the bar.
        if ((event.target as HTMLElement).closest("a,button")) return;
        onToggleCollapse();
      }}
      className={`border-line flex shrink-0 cursor-pointer items-center gap-2 border-b px-3 py-2.5 ${
        collapsed ? "border-b-transparent" : ""
      }`}
    >
      {children}

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapseLabel}
          aria-expanded={!collapsed}
          title={collapseLabel}
          className="hover:bg-elevated text-ink-faint hover:text-ink rounded-full p-1 transition-colors"
        >
          <ChevronGlyph
            className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>

        {onToggleExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expandLabel}
            aria-pressed={expanded}
            title={expandLabel}
            className="hover:bg-elevated text-ink-faint hover:text-ink rounded-full p-1 transition-colors"
          >
            {expanded ? <ShrinkGlyph /> : <ExpandGlyph />}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
          className="hover:bg-elevated text-ink-faint hover:text-ink rounded-full p-1 transition-colors"
        >
          <CloseGlyph />
        </button>
      </div>
    </div>
  );
}

function ExpandGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M14 4h6m0 0v6m0-6-7 7M10 20H4m0 0v-6m0 6 7-7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShrinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M20 4l-7 7m0 0h6m-6 0V5M4 20l7-7m0 0H5m6 0v6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
