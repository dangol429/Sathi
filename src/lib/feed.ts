/* ---------------------------------------------------------------------------
 * One feed route, filtered by query string.
 *
 * There is no page per niche. /feed?niche=tech is a real, linkable URL for the
 * tech feed, and opening a second niche costs nothing — no new route, no new
 * file.
 * ------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
 * The post-type filter: a fixed, closed set.
 *
 * Not open tags. Open tags let people file a post so specifically that nobody
 * finds it again, and they force a taxonomy to be invented before there are
 * real posts to learn from. Five buckets give the feed structure without
 * either problem.
 *
 * Next pass: this becomes a post_type enum on the posts table. Keep the values
 * below as the enum labels so nothing has to be migrated twice.
 * ------------------------------------------------------------------------- */

export type PostType = "all" | "question" | "career-story" | "opportunity" | "discussion";

/** Every type except the "all" pseudo-value — what a post can actually be. */
export type RealPostType = Exclude<PostType, "all">;

export type PostTypeOption = { value: PostType; label: string };

export const POST_TYPES: PostTypeOption[] = [
  { value: "all", label: "All" },
  { value: "question", label: "Question" },
  { value: "career-story", label: "Career Story" },
  { value: "opportunity", label: "Opportunity" },
  { value: "discussion", label: "Discussion" },
];

export function isPostType(value: string | undefined): value is PostType {
  return POST_TYPES.some((option) => option.value === value);
}

export function labelForType(type: PostType): string {
  return POST_TYPES.find((option) => option.value === type)?.label ?? "All";
}

/** Canonical URL for a feed view. Undefined niche means every niche. */
export function feedHref({
  niche,
  type,
}: { niche?: string | null; type?: PostType } = {}): string {
  const params = new URLSearchParams();
  if (niche) params.set("niche", niche);
  if (type && type !== "all") params.set("type", type);
  const query = params.toString();
  return query ? `/feed?${query}` : "/feed";
}
