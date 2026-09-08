"use client";

import { useState } from "react";
import { VerifiedStamp } from "@/components/brand";
import { PersonAvatar, PersonName } from "@/components/person-link";
import { useMockAuth } from "@/components/mock-auth";
import { DhogControl } from "@/components/mock-post-card";
import type { MockComment } from "@/lib/feed-mock";

/* ===========================================================================
 * The thread under a post.
 *
 * Reddit-shaped: top-level comments, replies nested under their parent and
 * collapsible. Each comment carries the same dhog control a post does — the
 * scoring model already treats a reaction on an answer as worth more than one
 * on a post, so nothing here needs its own idea of what a comment is worth.
 *
 * Top-level comments are ordered by the dhog they have been given. There is no
 * "accepted answer" and nothing to mark: the answer that actually helped
 * people collects dhog and ends up at the top on its own, which is the same
 * outcome without a control, a badge, or a rule about who may press it.
 *
 * Replies stay chronological under their parent — a conversation read out of
 * order is not a conversation.
 *
 * Replies live in component state and go nowhere. Mock pass.
 * ========================================================================= */

export function CommentThread({ comments }: { comments: MockComment[] }) {
  const { user, signedIn, requireAuth } = useMockAuth();
  const [tree, setTree] = useState(comments);
  const [given, setGiven] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  function addReply(parentId: string, text: string) {
    if (!user) return;

    const reply: MockComment = {
      id: `${parentId}-r${Date.now()}`,
      author: user,
      content: text,
      postedAt: "just now",
      dhog: 0,
      replies: [],
    };

    setTree((current) => insertReply(current, parentId, reply));
    setReplyingTo(null);
  }

  if (tree.length === 0) {
    return (
      <div className="border-line mt-4 border-t pt-4">
        <p className="text-ink-soft text-sm">No comments here yet.</p>
        <p className="text-ink-faint mt-1 text-xs">
          Only the Cedar Gate question has a mocked-out thread in this pass.
        </p>
      </div>
    );
  }

  // Best answer first, by the only measure the product has. Sorted on the
  // stored count rather than the count including your own click, so giving
  // dhog never reorders the thread under the cursor.
  const ordered = [...tree].sort((a, b) => b.dhog - a.dhog);

  return (
    <div className="border-line mt-4 space-y-4 border-t pt-4">
      {ordered.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          depth={0}
          given={given}
          onGive={(id) => setGiven((c) => ({ ...c, [id]: !c[id] }))}
          replyingTo={replyingTo}
          onReplyOpen={setReplyingTo}
          onReply={addReply}
          signedIn={signedIn}
          requireAuth={requireAuth}
        />
      ))}
    </div>
  );
}

type CommentProps = {
  comment: MockComment;
  depth: number;
  given: Record<string, boolean>;
  onGive: (id: string) => void;
  replyingTo: string | null;
  onReplyOpen: (id: string | null) => void;
  onReply: (parentId: string, text: string) => void;
  signedIn: boolean;
  requireAuth: (action?: () => void) => boolean;
};

function Comment({
  comment,
  depth,
  given,
  onGive,
  replyingTo,
  onReplyOpen,
  onReply,
  signedIn,
  requireAuth,
}: CommentProps) {
  const [repliesOpen, setRepliesOpen] = useState(true);
  const replyCount = comment.replies.length;

  return (
    <article className={depth > 0 ? "border-line border-l-2 pl-3.5" : ""}>
      <div className="flex items-start gap-2.5">
        <PersonAvatar name={comment.author.name} size={28} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <PersonName name={comment.author.name} className="font-semibold" />
            {comment.author.verified ? <VerifiedStamp /> : null}
            <span className="text-ink-faint text-xs">{comment.author.role}</span>
            <span className="text-ink-faint text-xs">· {comment.postedAt}</span>
          </p>

          <p className="prose-post mt-1.5 text-[0.95rem]">{comment.content}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* The same control the post uses — not a comment-shaped copy. */}
            <DhogControl
              id={comment.id}
              name={comment.author.name}
              stored={comment.dhog}
              given={Boolean(given[comment.id])}
              onGive={onGive}
              size="sm"
            />

            {/* Reading the thread is open to anyone; answering into it is not.
                A visitor pressing Reply gets the login modal rather than a box
                that turns out to be a dead end. */}
            <button
              type="button"
              onClick={() =>
                requireAuth(() => onReplyOpen(replyingTo === comment.id ? null : comment.id))
              }
              className="text-ink-soft hover:text-ink text-xs font-semibold transition-colors"
            >
              Reply
            </button>

            {replyCount > 0 ? (
              <button
                type="button"
                onClick={() => setRepliesOpen((open) => !open)}
                aria-expanded={repliesOpen}
                className="text-ink-soft hover:text-ink text-xs font-semibold transition-colors"
              >
                {repliesOpen ? `Hide replies (${replyCount})` : `Show replies (${replyCount})`}
              </button>
            ) : null}
          </div>

          {replyingTo === comment.id && signedIn ? (
            <ReplyBox
              onCancel={() => onReplyOpen(null)}
              onSubmit={(text) => onReply(comment.id, text)}
            />
          ) : null}

          {repliesOpen && replyCount > 0 ? (
            <div className="mt-3 space-y-3">
              {/* Chronological, deliberately: replies are a conversation. */}
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  given={given}
                  onGive={onGive}
                  replyingTo={replyingTo}
                  onReplyOpen={onReplyOpen}
                  onReply={onReply}
                  signedIn={signedIn}
                  requireAuth={requireAuth}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Only ever rendered for a signed-in user — the Reply button is the gate. */
function ReplyBox({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <form
      className="mt-3"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = text.trim();
        if (trimmed) onSubmit(trimmed);
        setText("");
      }}
    >
      <textarea
        className="field min-h-16 resize-y text-sm leading-relaxed"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Say something useful."
        aria-label="Your reply"
        autoFocus
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={text.trim().length === 0}
          className="btn btn-primary btn-sm"
        >
          Reply
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Immutably drop a reply under its parent, wherever in the tree that is. */
function insertReply(comments: MockComment[], parentId: string, reply: MockComment): MockComment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return { ...comment, replies: [...comment.replies, reply] };
    }
    if (comment.replies.length > 0) {
      return { ...comment, replies: insertReply(comment.replies, parentId, reply) };
    }
    return comment;
  });
}
