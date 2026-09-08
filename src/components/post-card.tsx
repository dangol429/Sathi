import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { VerifiedStamp } from "@/components/brand";
import { HelpfulButton } from "@/components/helpful-button";
import { excerpt, timeAgo } from "@/lib/format";
import type { FeedPost } from "@/lib/queries";

export function PostCard({
  post,
  reacted,
  revalidatePath,
  showAuthor = true,
  clamp = true,
}: {
  post: FeedPost;
  reacted: boolean;
  revalidatePath: string;
  showAuthor?: boolean;
  clamp?: boolean;
}) {
  const professional = post.space?.professional;
  const name = professional?.display_name ?? post.author?.full_name ?? "Someone";
  const body = clamp ? excerpt(post.content) : { text: post.content, truncated: false };

  return (
    <article className="card card-lift p-5">
      {showAuthor ? (
        <header className="mb-3 flex items-start gap-3">
          <Avatar name={name} src={post.author?.avatar_url} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {professional ? (
                <Link
                  href={`/space/${professional.id}`}
                  className="hover:text-crimson font-display text-[1.05rem] leading-tight font-semibold transition-colors"
                >
                  {name}
                </Link>
              ) : (
                <span className="font-display text-[1.05rem] leading-tight font-semibold">
                  {name}
                </span>
              )}
              {professional?.founding_member ? (
                <VerifiedStamp founding />
              ) : professional?.verification_status === "verified" ? (
                <VerifiedStamp />
              ) : null}
            </div>
            <p className="text-ink-soft mt-0.5 truncate text-sm">
              {professional?.headline ?? post.space?.headline ?? ""}
            </p>
          </div>
          <time
            dateTime={post.created_at}
            className="text-ink-faint shrink-0 text-xs font-medium whitespace-nowrap"
          >
            {timeAgo(post.created_at)}
          </time>
        </header>
      ) : (
        <header className="mb-2 flex items-center justify-between">
          {post.kind === "intro" ? (
            <span className="eyebrow">Introduction</span>
          ) : (
            <span className="eyebrow text-ink-faint">Post</span>
          )}
          <time dateTime={post.created_at} className="text-ink-faint text-xs font-medium">
            {timeAgo(post.created_at)}
          </time>
        </header>
      )}

      <div className="prose-post text-[0.95rem]">{body.text}</div>

      {body.truncated ? (
        <Link href={`/post/${post.id}`} className="link-ink mt-2 inline-block text-sm font-semibold">
          Read the rest
        </Link>
      ) : null}

      <footer className="border-line mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        <HelpfulButton
          postId={post.id}
          count={post.helpfulCount}
          reacted={reacted}
          revalidatePath={revalidatePath}
        />

        <Link
          href={`/post/${post.id}`}
          className="hover:bg-elevated text-ink-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
        >
          <SpeechGlyph />
          {post.commentCount === 0
            ? "Comment"
            : `${post.commentCount} ${post.commentCount === 1 ? "reply" : "replies"}`}
        </Link>

        {showAuthor && professional?.niche ? (
          <Link
            href={`/feed?niche=${professional.niche.slug}`}
            className="chip ml-auto hover:border-line transition-colors"
          >
            <span aria-hidden>{professional.niche.emoji}</span>
            {professional.niche.name}
          </Link>
        ) : null}
      </footer>
    </article>
  );
}

function SpeechGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.1 9.1 0 0 1-3.3-.6L3 21l1.8-4.5A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
