import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Pennant, VerifiedStamp } from "@/components/brand";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { getViewer } from "@/lib/auth";
import { parseProfileLinks } from "@/lib/database.types";
import { getFollowerCount, getPostsForSpace, getSpace, getViewerReactions, isFollowing } from "@/lib/queries";
import { toggleFollow } from "@/app/actions/social";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ professional_id: string }>;
}): Promise<Metadata> {
  const { professional_id } = await params;
  const space = await getSpace(professional_id);
  const professional = space?.professional;
  return {
    title: professional ? professional.display_name : "Space",
    description: professional?.headline ?? undefined,
  };
}

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ professional_id: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [{ professional_id }, { welcome }] = await Promise.all([params, searchParams]);

  const space = await getSpace(professional_id);
  if (!space?.professional) notFound();

  const professional = space.professional;
  if (professional.verification_status !== "verified") notFound();

  const [posts, viewer, followers] = await Promise.all([
    getPostsForSpace(space.id),
    getViewer(),
    getFollowerCount(professional.id),
  ]);

  const [reacted, following] = await Promise.all([
    getViewerReactions(posts.map((post) => post.id)),
    viewer ? isFollowing(professional.id, viewer.id) : Promise.resolve(false),
  ]);

  const isOwner = viewer?.id === professional.user_id;
  const links = parseProfileLinks(professional.links);
  const path = `/space/${professional.id}`;

  return (
    <>
      {welcome && isOwner ? (
        <div className="bg-jade text-on-accent px-4 py-2.5 text-center text-sm font-semibold">
          Published. This is your space — everything you post lands here.
        </div>
      ) : null}

      {/* Cover band */}
      <div className="lattice border-line relative h-36 border-b sm:h-44">
        <div className="bg-paper/40 absolute inset-0" aria-hidden />
        <Pennant className="absolute right-6 bottom-4 h-16 w-auto opacity-70 sm:right-10 sm:h-24" />
      </div>

      {/*
        LinkedIn-meets-Facebook: a fixed identity rail on the left that stays
        put, and a running feed on the right. Not a centred single column.
      */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[340px_1fr]">
        {/* --- Identity rail ------------------------------------------- */}
        <aside className="z-sticky lg:sticky lg:top-24 lg:self-start">
          <div className="card -mt-14 p-5">
            <Avatar
              name={professional.display_name}
              src={professional.user?.avatar_url}
              size={84}
            />

            <h1 className="mt-3 text-2xl leading-tight">{professional.display_name}</h1>
            {professional.headline ? (
              <p className="text-ink-soft mt-1 text-sm leading-relaxed">{professional.headline}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {professional.founding_member ? <VerifiedStamp founding /> : <VerifiedStamp />}
              {professional.niche ? (
                <Link href={`/feed?niche=${professional.niche.slug}`} className="chip">
                  <span aria-hidden>{professional.niche.emoji}</span>
                  {professional.niche.name}
                </Link>
              ) : null}
            </div>

            <div className="border-line text-ink-soft mt-4 flex items-center gap-4 border-t pt-4 text-sm">
              <span>
                <strong className="text-ink font-display text-lg font-semibold">
                  {posts.length}
                </strong>{" "}
                post{posts.length === 1 ? "" : "s"}
              </span>
              <span>
                <strong className="text-ink font-display text-lg font-semibold">{followers}</strong>{" "}
                follower{followers === 1 ? "" : "s"}
              </span>
            </div>

            {!isOwner ? (
              viewer ? (
                <form action={toggleFollow.bind(null, professional.id, path)} className="mt-4">
                  <button
                    type="submit"
                    className={`btn w-full ${following ? "btn-paper" : "btn-primary"}`}
                  >
                    {following ? "Following ✓" : "Follow"}
                  </button>
                </form>
              ) : (
                <Link href="/signup" className="btn btn-primary mt-4 w-full">
                  Join to follow
                </Link>
              )
            ) : (
              <Link href="/onboarding/professional" className="btn btn-paper mt-4 w-full">
                Edit profile
              </Link>
            )}
          </div>

          {professional.bio ? (
            <section className="card-soft mt-4 p-5">
              <h2 className="eyebrow">About</h2>
              <p className="prose-post mt-2.5 text-sm">{professional.bio}</p>
            </section>
          ) : null}

          <section className="card-soft mt-4 p-5">
            <h2 className="eyebrow">Elsewhere</h2>
            <ul className="mt-2.5 space-y-2 text-sm">
              <li>
                <a
                  href={professional.linkedin_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-ink font-semibold"
                >
                  LinkedIn ↗
                </a>
              </li>
              {links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-ink font-semibold break-words"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
            {links.length === 0 ? (
              <p className="text-ink-faint mt-2 text-xs">
                {isOwner ? "Add links from Edit profile." : "No other links yet."}
              </p>
            ) : null}
          </section>
        </aside>

        {/* --- Feed ----------------------------------------------------- */}
        <div className="pt-6 lg:pt-8">
          {space.headline ? (
            <p className="font-display text-ink-soft mb-5 text-xl">{space.headline}</p>
          ) : null}

          {isOwner ? (
            <div className="mb-6">
              <PostComposer displayName={professional.display_name} />
            </div>
          ) : null}

          {posts.length > 0 ? (
            <div className="space-y-5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  reacted={reacted.has(post.id)}
                  revalidatePath={path}
                  showAuthor={false}
                />
              ))}
            </div>
          ) : (
            <div className="card-soft p-10 text-center">
              <p className="font-display text-2xl">Nothing here yet.</p>
              <p className="text-ink-soft mx-auto mt-2 max-w-sm text-sm leading-relaxed">
                {isOwner
                  ? "Your space is live but empty. One honest post is enough to start getting questions."
                  : `${professional.display_name} has not posted yet. Follow to hear about it when they do.`}
              </p>
              {isOwner ? (
                <Link href="/onboarding/professional/first-post" className="btn btn-primary mt-5">
                  Write your first post
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
