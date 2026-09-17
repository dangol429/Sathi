"use client";

import { useEffect, useState } from "react";
import { VerifiedStamp } from "@/components/brand";
import { useMockAuth } from "@/components/mock-auth";
import { PostActions } from "@/components/post-actions";
import { PersonAvatar, PersonName } from "@/components/person-link";
import { CommentThread } from "@/components/comment-thread";
import { getComments } from "@/lib/api";
import { displayDhog } from "@/lib/dhog";
import { displayReposts } from "@/lib/repost";
import {
  nicheForPost,
  type MockAuthor,
  type MockComment,
  type MockPost,
  type MockRepost,
} from "@/lib/feed-mock";
import { labelForType, type RealPostType } from "@/lib/feed";

/* ===========================================================================
 * One post, as the feed draws it.
 *
 * Lives here rather than inside the feed so the profile can render the same
 * card rather than a lookalike — if the dhog control changes, it changes in both
 * places at once.
 * ========================================================================= */

/**
 * Two unrelated things, deliberately kept apart.
 *
 * Giving dhog is public appreciation and the only thing that moves a number.
 * Flagging is a private note to a moderator: it is not a downvote, it is not
 * counted, nobody else can see it, and it can never reduce anyone's dhog.
 * They are not opposites, so they do not share a control, a row, or a lock.
 */
export type Given = Record<string, boolean>;
export type Flagged = Record<string, boolean>;

/**
 * Which posts the viewer has passed on.
 *
 * Unlike `given`, this is not a local guess: it is seeded from the store on
 * load, because a repost is a card sitting in somebody's feed rather than a
 * number that resets when you look away.
 */
export type Reposted = Record<string, boolean>;

const TYPE_BADGE: Record<RealPostType, string> = {
  question: "border-crimson/40 bg-crimson-wash text-crimson-deep",
  "career-story": "border-indigo/30 bg-indigo/8 text-indigo",
  opportunity: "border-jade/40 bg-jade/10 text-jade",
  discussion: "border-turmeric/50 bg-marigold-wash text-turmeric",
};

export function PostCard({
  post,
  given,
  flagged,
  reposted,
  repostedBy,
  onGive,
  onFlag,
  onRepost,
  onEdit,
  onDelete,
}: {
  post: MockPost;
  given: Given;
  flagged: Flagged;
  reposted: Reposted;
  /**
   * Set when this slot is somebody passing the post on rather than writing it.
   * The card underneath stays the original author's — only the banner changes.
   */
  repostedBy?: MockRepost;
  onGive: (id: string) => void;
  onFlag: (id: string) => void;
  onRepost: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { user } = useMockAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [comments, setComments] = useState<MockComment[] | null>(null);
  const isOwn = Boolean(user && user.name === post.author.name);

  // Fetched when the thread is first opened rather than with the post: a feed
  // of twenty cards should not pull twenty threads nobody has asked to read.
  useEffect(() => {
    if (!open || comments) return;
    let live = true;
    void getComments(post.id).then((rows) => {
      if (live) setComments(rows);
    });
    return () => {
      live = false;
    };
  }, [open, comments, post.id]);

  return (
    <article className="card p-5">
      {/* Above everything, and visibly not part of the post: this is the only
          line on the card that is about the reposter rather than the author. */}
      {repostedBy ? (
        <p className="text-ink-soft border-line mb-4 flex flex-wrap items-center gap-1.5 border-b pb-3 text-xs font-semibold">
          <RepostGlyph />
          {repostedBy.bySlug === user?.slug ? (
            "You reposted"
          ) : (
            <>
              <PersonName name={repostedBy.by.name} className="font-semibold" />
              reposted
            </>
          )}
          <span className="text-ink-faint font-medium">· {repostedBy.postedAt}</span>
        </p>
      ) : null}

      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[0.66rem] font-bold tracking-[0.12em] uppercase ${TYPE_BADGE[post.type]}`}
          >
            {labelForType(post.type)}
          </span>
          <NicheBadge post={post} />
        </span>
        <span className="text-ink-faint ml-auto text-xs font-medium">
          {post.postedAt}
          {post.editedAt ? <span className="ml-1">· edited</span> : null}
        </span>
        {/* Up here, away from the dhog control and looking nothing like it:
            this is a note to a moderator, not the other half of a vote. */}
        <FlagButton
          id={post.id}
          label={`this post by ${post.author.name}`}
          flagged={Boolean(flagged[post.id])}
          onFlag={onFlag}
        />
        <PostActions
          postId={post.id}
          isOwn={isOwn}
          createdAt={post.createdAt}
          onEdit={() => {
            setDraft(post.content);
            setEditing(true);
          }}
          onDelete={() => onDelete?.(post.id)}
        />
      </header>

      <Byline author={post.author} />

      {editing ? (
        <div className="mt-4">
          <textarea
            className="field min-h-28 resize-y leading-relaxed"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Edit your post"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={draft.trim().length === 0}
              onClick={() => {
                onEdit?.(post.id, draft.trim());
                setEditing(false);
              }}
              className="btn btn-primary btn-sm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="prose-post mt-4 text-[0.98rem]">{post.content}</p>
      )}

      {post.imageUrl ? (
        <div className="border-line mt-4 overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="" className="max-h-96 w-full object-cover" />
        </div>
      ) : null}

      <footer className="border-line mt-5 flex flex-wrap items-center gap-x-1 gap-y-2 border-t pt-4">
        <DhogControl
          id={post.id}
          name={post.author.name}
          stored={post.dhog}
          given={Boolean(given[post.id])}
          onGive={onGive}
        />

        <ReactionButton
          onClick={() => setOpen((current) => !current)}
          emoji="💬"
          count={post.comments}
          label={open ? "Hide comments" : "Show comments"}
          aria-expanded={open}
        />

        <RepostControl
          id={post.id}
          name={post.author.name}
          stored={post.reposts}
          reposted={Boolean(reposted[post.id])}
          isOwn={isOwn}
          onRepost={onRepost}
        />
      </footer>

      {open ? (
        comments ? (
          <CommentThread comments={comments} />
        ) : (
          <p className="text-ink-faint border-line mt-4 border-t pt-4 text-sm">Loading…</p>
        )
      ) : null}
    </article>
  );
}

/**
 * Which niche a post was written in, next to what kind of post it is.
 *
 * Quieter than the type badge on purpose: the type tells you what you are
 * about to read, the niche only tells you which room you are standing in — and
 * with one niche open, every badge on the page says the same word. It earns
 * its place the day a second niche exists, and it is drawn now so the layout
 * does not shift when that happens.
 */
function NicheBadge({ post }: { post: MockPost }) {
  const niche = nicheForPost(post);
  return (
    <span className="border-line-soft text-ink-soft inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.66rem] font-bold tracking-[0.08em] uppercase">
      <span aria-hidden>{niche.emoji}</span>
      {niche.name}
    </span>
  );
}

/**
 * Name and verification.
 *
 * No recognition tier here. The tier system exists (RECOGNITION_TIERS in
 * lib/dhog.ts) but its names are still TIER_1…TIER_5 placeholders, and a badge
 * reading "TIER_3" next to somebody's name does not look unfinished, it looks
 * broken. Nothing renders a tier until the real names are decided.
 */
function Byline({ author, size = 44 }: { author: MockAuthor; size?: number }) {
  return (
    <div className="mt-4 flex items-start gap-3">
      <PersonAvatar name={author.name} size={size} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <PersonName
            name={author.name}
            className="font-display text-[1.05rem] leading-tight font-semibold"
          />
          {author.verified ? <VerifiedStamp /> : null}
        </div>
        <p className="text-ink-soft mt-0.5 text-sm">
          {author.role} · {author.city}
        </p>
      </div>
    </div>
  );
}

/**
 * Giving dhog, and the comment count next to it, are the same kind of thing:
 * an emoji and a number you can press. Neither is a filled button.
 *
 * The old treatment made dhog a loud crimson pill sitting beside a plain grey
 * count, which read as a call to action rather than as one of two things you
 * might do — and dhog is meant to be given, not sold.
 *
 * Nothing here asks for dhog, reminds anyone to return it, or tells a
 * recipient who gave it.
 *
 * Giving is a toggle, like a like: press once to give, press again to take it
 * back. It used to lock after the first press, which left anyone who misfired
 * with no way out — and a gift you cannot withdraw is a strange kind of gift.
 *
 * The auth check lives in here rather than in the three places that render a
 * DhogControl. A visitor can read every count on the page; pressing one opens
 * the login modal instead of silently doing nothing. Putting the gate in the
 * control is the only way it cannot be forgotten by the next caller.
 */
export function DhogControl({
  id,
  name,
  stored,
  given,
  onGive,
  size = "md",
}: {
  id: string;
  name: string;
  stored: number;
  given: boolean;
  onGive: (id: string) => void;
  /** "sm" is the same control, quieter, for a comment. */
  size?: "md" | "sm";
}) {
  const { requireAuth } = useMockAuth();

  return (
    <ReactionButton
      onClick={() => requireAuth(() => onGive(id))}
      pressed={given}
      active={given}
      emoji="🙏"
      /* A plain total. No formula, no breakdown, no list of who gave it. */
      count={displayDhog(stored, given)}
      label={given ? `Take back your dhog to ${name}` : `Give dhog to ${name}`}
      size={size}
      live
    />
  );
}

/**
 * Passing a post on.
 *
 * The third thing you can do to a post, and deliberately the same shape as the
 * other two — an emoji and a number — because reposting is not a bigger deal
 * than thanking somebody, it is just a different one.
 *
 * It is a toggle for the same reason dhog is: a repost you cannot withdraw
 * turns a misfire into somebody else's permanent feed item.
 *
 * You cannot repost your own post. The count still shows, because a reader
 * should be able to see how far something travelled, but the control is inert:
 * a banner reading "Bishal T. reposted" over Bishal T.'s own card is noise, and
 * circulation is meant to be other people vouching for you.
 */
function RepostControl({
  id,
  name,
  stored,
  reposted,
  isOwn,
  onRepost,
}: {
  id: string;
  name: string;
  stored: number | undefined;
  reposted: boolean;
  isOwn: boolean;
  onRepost: (id: string) => void;
}) {
  const { requireAuth } = useMockAuth();
  const count = displayReposts(stored, reposted);

  if (isOwn) {
    return (
      <ReactionButton
        onClick={() => {}}
        emoji="🔁"
        count={count}
        label={`${count} ${count === 1 ? "repost" : "reposts"}`}
        title="You can't repost your own post"
        disabled
      />
    );
  }

  return (
    <ReactionButton
      onClick={() => requireAuth(() => onRepost(id))}
      pressed={reposted}
      active={reposted}
      emoji="🔁"
      count={count}
      label={reposted ? `Undo your repost of ${name}'s post` : `Repost ${name}'s post`}
      live
    />
  );
}

function RepostGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden>
      <path
        d="M4 9V7.5A2.5 2.5 0 0 1 6.5 5H17m0 0-3-3m3 3-3 3M20 15v1.5a2.5 2.5 0 0 1-2.5 2.5H7m0 0 3 3m-3-3 3-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * One emoji, one number, no chrome. Shared so a reaction cannot end up looking
 * more important than its neighbour by accident.
 */
function ReactionButton({
  onClick,
  emoji,
  count,
  label,
  pressed,
  active = false,
  size = "md",
  live = false,
  ...rest
}: {
  onClick: () => void;
  emoji: string;
  count: number;
  label: string;
  /** Present for a toggle; omitted for a button that just does a thing. */
  pressed?: boolean;
  active?: boolean;
  size?: "md" | "sm";
  live?: boolean;
} & React.ComponentPropsWithoutRef<"button">) {
  const small = size === "sm";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={`hover:bg-elevated inline-flex items-center gap-1.5 rounded-full transition-colors disabled:cursor-default ${
        small ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"
      } ${active ? "text-crimson font-bold" : "text-ink-soft hover:text-ink font-semibold"}`}
      {...rest}
    >
      <span aria-hidden className={small ? "text-sm leading-none" : "text-base leading-none"}>
        {emoji}
      </span>
      <span aria-live={live ? "polite" : undefined} className="tabular-nums">
        {count}
      </span>
    </button>
  );
}

/**
 * "Not helpful", as a private flag.
 *
 * No count, no public state, no effect on anybody's dhog — it puts the thing
 * in front of a human and says so. Small and grey on purpose: this is not the
 * other half of the dhog button.
 */
function FlagButton({
  id,
  label,
  flagged,
  onFlag,
}: {
  id: string;
  label: string;
  flagged: boolean;
  onFlag: (id: string) => void;
}) {
  if (flagged) {
    return (
      <span className="text-ink-faint inline-flex items-center gap-1 text-xs" role="status">
        <FlagGlyph />
        Sent to a moderator
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onFlag(id)}
      title="Privately tell a moderator this is unhelpful. It is not a downvote and changes nobody's dhog."
      aria-label={`Privately flag ${label} for a moderator`}
      className="text-ink-faint hover:text-ink-soft inline-flex items-center gap-1 text-xs transition-colors"
    >
      <FlagGlyph />
      Flag
    </button>
  );
}

function FlagGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M6 21V4m0 0 5.5 2.5L18 4v9l-6.5 2.5L6 13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
