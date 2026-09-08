import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { VerifiedStamp } from "@/components/brand";
import { CommentForm } from "@/components/comment-form";
import { HelpfulButton } from "@/components/helpful-button";
import { getViewer } from "@/lib/auth";
import { excerpt, timeAgo } from "@/lib/format";
import { getComments, getPost, getViewerReactions } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: "Post" };

  const name = post.space?.professional?.display_name ?? "A professional";
  return {
    title: `${name} on Sathi`,
    description: excerpt(post.content, 155).text,
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await getPost(id);
  if (!post) notFound();

  const [comments, viewer, reacted] = await Promise.all([
    getComments(id),
    getViewer(),
    getViewerReactions([id]),
  ]);

  const professional = post.space?.professional;
  const name = professional?.display_name ?? post.author?.full_name ?? "Someone";
  const path = `/post/${id}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {professional ? (
        <Link href={`/space/${professional.id}`} className="link-ink text-sm font-semibold">
          ← Back to {name}&rsquo;s space
        </Link>
      ) : null}

      <article className="card mt-4 p-6 sm:p-8">
        <header className="flex items-start gap-4">
          <Avatar name={name} src={post.author?.avatar_url} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {professional ? (
                <Link
                  href={`/space/${professional.id}`}
                  className="hover:text-crimson font-display text-xl leading-tight font-semibold transition-colors"
                >
                  {name}
                </Link>
              ) : (
                <span className="font-display text-xl font-semibold">{name}</span>
              )}
              {professional?.founding_member ? <VerifiedStamp founding /> : <VerifiedStamp />}
            </div>
            <p className="text-ink-soft mt-0.5 text-sm">
              {professional?.headline ?? ""}
              {professional?.headline ? <span aria-hidden> · </span> : null}
              <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            </p>
          </div>
        </header>

        {post.kind === "intro" ? (
          <p className="eyebrow mt-5">Introduction</p>
        ) : null}

        <div className="prose-post mt-4 text-[1.02rem]">{post.content}</div>

        <footer className="border-line mt-6 flex flex-wrap items-center gap-3 border-t pt-4">
          <HelpfulButton
            postId={post.id}
            count={post.helpfulCount}
            reacted={reacted.has(post.id)}
            revalidatePath={path}
          />
          {professional?.niche ? (
            <Link href={`/feed?niche=${professional.niche.slug}`} className="chip ml-auto">
              <span aria-hidden>{professional.niche.emoji}</span>
              {professional.niche.name}
            </Link>
          ) : null}
        </footer>
      </article>

      {/* --- Thread ----------------------------------------------------- */}
      <section className="mt-10">
        <h2 className="text-2xl">
          {comments.length === 0
            ? "No replies yet"
            : `${comments.length} ${comments.length === 1 ? "reply" : "replies"}`}
        </h2>

        {comments.length > 0 ? (
          <ul className="mt-5 space-y-4">
            {comments.map((comment) => {
              const isAuthor = comment.author_id === post.author_id;
              return (
                <li
                  key={comment.id}
                  className={`card-soft p-4 ${isAuthor ? "border-crimson/40 bg-crimson-wash/30" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={comment.author?.full_name ?? "Someone"}
                      src={comment.author?.avatar_url}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="text-sm leading-tight font-semibold">
                        {comment.author?.full_name ?? "Someone"}
                        {isAuthor ? (
                          <span className="text-crimson ml-2 text-[0.65rem] font-bold tracking-wider uppercase">
                            Author
                          </span>
                        ) : null}
                      </p>
                      <time
                        dateTime={comment.created_at}
                        className="text-ink-faint text-xs font-medium"
                      >
                        {timeAgo(comment.created_at)}
                      </time>
                    </div>
                  </div>
                  <p className="prose-post mt-2.5 text-[0.95rem]">{comment.content}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-ink-soft mt-2 text-sm">
            Be the first to ask a follow-up. Real questions get real answers here.
          </p>
        )}

        <div className="card mt-6 p-5">
          {viewer ? (
            <CommentForm postId={post.id} />
          ) : (
            <div className="text-center">
              <p className="font-display text-lg">Sign in to join the thread.</p>
              <p className="text-ink-soft mt-1 text-sm">
                Learners get in with no gate — it takes thirty seconds.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="btn btn-primary btn-sm">
                  Join as a learner
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(path)}`}
                  className="btn btn-paper btn-sm"
                >
                  Log in
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
