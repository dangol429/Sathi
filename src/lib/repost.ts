import type { MockPost, MockRepost } from "@/lib/feed-mock";

/* ---------------------------------------------------------------------------
 * Reposting, on the client.
 *
 * A repost is a pointer to somebody else's post, not a copy of it. That single
 * decision is what the rest of this file is about: a timeline slot can be
 * either "this person wrote something" or "this person passed something on",
 * and the second kind still renders the first person's card underneath.
 *
 * Separate from lib/dhog.ts deliberately. Dhog is the appreciation model and
 * carries weighting rules the client is not allowed to know; a repost is plain
 * circulation, worth exactly one repost to everybody, with nothing hidden
 * behind it.
 * ------------------------------------------------------------------------- */

/**
 * What to show under a card after you press repost.
 *
 * Optimistic, like displayDhog: the baseline is what everyone else has done
 * and your own press is added on top, so the number moves the instant you
 * press it rather than after a round trip.
 */
export function displayReposts(stored: number | undefined, youReposted: boolean): number {
  return (stored ?? 0) + (youReposted ? 1 : 0);
}

/** A repost with the post it points at already resolved. */
export type RepostEntry = {
  repost: MockRepost;
  post: MockPost;
};

/**
 * One slot in a feed or a profile.
 *
 * `repost` present means somebody passed this on and the card gets a banner
 * saying who; absent means they wrote it themselves.
 */
export type TimelineEntry = {
  /** Stable across renders. A post can appear as itself and as a repost. */
  key: string;
  post: MockPost;
  repost?: MockRepost;
};

/**
 * Weave reposts into a list of posts.
 *
 * `include` decides which reposts survive the caller's current filter, and it
 * has to be a predicate rather than "is this post in `posts`" — the two callers
 * mean genuinely different things by it:
 *
 *   feed     the reposted post is one of the posts on screen, so membership in
 *            the already-filtered list is the test
 *   profile  the reposted post belongs to somebody else entirely and is NOT in
 *            this person's posts. Requiring membership there hid every repost
 *            on every profile, which is exactly what it did the first time.
 *
 * One rule is shared, and stays: if a post is being shown as a repost, it is
 * not also shown plainly. Circulation is the more recent event, so the repost
 * wins the slot — and in a feed this short, the same card twice reads as a bug.
 *
 * Reposts come first because passing something on is the newer activity. The
 * caller is free to re-sort afterwards; trending does, on the underlying post.
 */
export function buildTimeline(
  posts: MockPost[],
  entries: RepostEntry[],
  include: (post: MockPost) => boolean = () => true,
): TimelineEntry[] {
  const shown = entries.filter((entry) => include(entry.post));
  const reposted = new Set(shown.map((entry) => entry.post.id));
  const plain = posts.filter((post) => !reposted.has(post.id));

  /*
   * Anything written in this session leads, ahead of the reposts.
   *
   * `createdAt` is only set on posts composed in this tab — the seeded ones
   * deliberately have none — so it is exactly the test for "this just
   * happened". Without this, a post you wrote a second ago appeared *below*
   * somebody else's hour-old repost, because every repost outranked every
   * post. Watching your own post land in second place reads as the composer
   * having failed.
   */
  const fresh = plain.filter((post) => post.createdAt !== undefined);
  const rest = plain.filter((post) => post.createdAt === undefined);

  return [
    ...fresh.map((post) => ({ key: post.id, post })),
    ...shown.map((entry) => ({
      key: `repost-${entry.repost.id}`,
      post: entry.post,
      repost: entry.repost,
    })),
    ...rest.map((post) => ({ key: post.id, post })),
  ];
}
