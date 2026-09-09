import { createClient } from "@/lib/supabase/server";
import type { Json, NicheRow, PostKind, VerificationStatus } from "@/lib/database.types";

/* ---------------------------------------------------------------------------
 * Shapes returned by the nested selects below. PostgREST's response types are
 * not worth inferring generically — declaring them explicitly keeps the
 * components honest.
 * ------------------------------------------------------------------------- */

export type FeedAuthor = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type FeedNiche = Pick<NicheRow, "id" | "name" | "slug" | "emoji" | "accent">;

export type FeedProfessional = {
  id: string;
  display_name: string;
  headline: string | null;
  founding_member: boolean;
  verification_status: VerificationStatus;
  niche: FeedNiche | null;
};

export type FeedSpace = {
  id: string;
  slug: string;
  headline: string | null;
  professional: FeedProfessional | null;
};

export type FeedPost = {
  id: string;
  content: string;
  kind: PostKind;
  created_at: string;
  space_id: string;
  author_id: string;
  author: FeedAuthor | null;
  space: FeedSpace | null;
  commentCount: number;
  helpfulCount: number;
};

type RawFeedPost = Omit<FeedPost, "commentCount" | "helpfulCount"> & {
  comments: { count: number }[] | null;
  reactions: { count: number }[] | null;
};

const POST_SELECT = `
  id, content, kind, created_at, space_id, author_id,
  author:users!posts_author_id_fkey ( id, full_name, avatar_url ),
  space:spaces!inner (
    id, slug, headline,
    professional:professional_profiles!inner (
      id, display_name, headline, founding_member, verification_status,
      niche:niches ( id, name, slug, emoji, accent )
    )
  ),
  comments ( count ),
  reactions ( count )
`;

function normalisePosts(rows: RawFeedPost[] | null): FeedPost[] {
  return (rows ?? []).map(({ comments, reactions, ...post }) => ({
    ...post,
    commentCount: comments?.[0]?.count ?? 0,
    helpfulCount: reactions?.[0]?.count ?? 0,
  }));
}

/* ---------------------------------------------------------------------------
 * Niches
 * ------------------------------------------------------------------------- */

export async function getActiveNiches(): Promise<NicheRow[]> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return [];
  const { data } = await supabase
    .from("niches")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getNicheBySlug(slug: string): Promise<NicheRow | null> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return null;
  const { data } = await supabase.from("niches").select("*").eq("slug", slug).maybeSingle();
  return data ?? null;
}

/* ---------------------------------------------------------------------------
 * Posts
 * ------------------------------------------------------------------------- */

export async function getRecentPosts({
  nicheId,
  limit = 12,
}: { nicheId?: string; limit?: number } = {}): Promise<FeedPost[]> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return [];

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("space.professional.verification_status", "verified")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (nicheId) query = query.eq("space.professional.niche_id", nicheId);

  const { data, error } = await query;
  if (error) {
    console.error("[queries] getRecentPosts", error.message);
    return [];
  }
  return normalisePosts(data as unknown as RawFeedPost[]);
}

export async function getPostsForSpace(spaceId: string, limit = 50): Promise<FeedPost[]> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[queries] getPostsForSpace", error.message);
    return [];
  }
  return normalisePosts(data as unknown as RawFeedPost[]);
}

export async function getPost(postId: string): Promise<FeedPost | null> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .maybeSingle();

  if (error || !data) return null;
  return normalisePosts([data as unknown as RawFeedPost])[0] ?? null;
}

export type ThreadComment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: FeedAuthor | null;
};

export async function getComments(postId: string): Promise<ThreadComment[]> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, content, created_at, author_id, author:users!comments_author_id_fkey ( id, full_name, avatar_url )",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[queries] getComments", error.message);
    return [];
  }
  return (data ?? []) as unknown as ThreadComment[];
}

/** Which of these posts has the current user already marked helpful? */
export async function getViewerReactions(postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return new Set<string>();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("reactions")
    .select("post_id")
    .eq("user_id", user.id)
    .in("post_id", postIds);

  return new Set((data ?? []).map((row) => row.post_id).filter((id): id is string => Boolean(id)));
}

/* ---------------------------------------------------------------------------
 * Professionals & spaces
 * ------------------------------------------------------------------------- */

export type SpaceDetail = {
  id: string;
  slug: string;
  headline: string | null;
  professional: {
    id: string;
    user_id: string;
    display_name: string;
    headline: string | null;
    bio: string | null;
    linkedin_url: string;
    founding_member: boolean;
    verification_status: VerificationStatus;
    links: Json;
    created_at: string;
    niche: FeedNiche | null;
    user: FeedAuthor | null;
  } | null;
};

const SPACE_SELECT = `
  id, slug, headline,
  professional:professional_profiles!inner (
    id, user_id, display_name, headline, bio, linkedin_url, founding_member,
    verification_status, links, created_at,
    niche:niches ( id, name, slug, emoji, accent ),
    user:users!professional_profiles_user_id_fkey ( id, full_name, avatar_url )
  )
`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Accepts either a professional_profiles.id or a space slug. */
export async function getSpace(handle: string): Promise<SpaceDetail | null> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return null;
  const query = supabase.from("spaces").select(SPACE_SELECT);

  const { data, error } = UUID_RE.test(handle)
    ? await query.eq("professional_id", handle).maybeSingle()
    : await query.eq("slug", handle).maybeSingle();

  if (error || !data) return null;
  return data as unknown as SpaceDetail;
}

export type ProfessionalCard = {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  founding_member: boolean;
  niche: FeedNiche | null;
  user: FeedAuthor | null;
  space: { id: string; slug: string } | null;
};

export async function getVerifiedProfessionals({
  nicheId,
  limit = 24,
}: { nicheId?: string; limit?: number } = {}): Promise<ProfessionalCard[]> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return [];

  let query = supabase
    .from("professional_profiles")
    .select(
      `id, display_name, headline, bio, founding_member,
       niche:niches ( id, name, slug, emoji, accent ),
       user:users!professional_profiles_user_id_fkey ( id, full_name, avatar_url ),
       space:spaces ( id, slug )`,
    )
    .eq("verification_status", "verified")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (nicheId) query = query.eq("niche_id", nicheId);

  const { data, error } = await query;
  if (error) {
    console.error("[queries] getVerifiedProfessionals", error.message);
    return [];
  }

  // `space` comes back as an array for a to-many shaped relationship.
  return (data ?? []).map((row) => {
    const raw = row as unknown as Omit<ProfessionalCard, "space"> & {
      space: { id: string; slug: string }[] | { id: string; slug: string } | null;
    };
    return {
      ...raw,
      space: Array.isArray(raw.space) ? (raw.space[0] ?? null) : raw.space,
    };
  });
}

export async function getFollowerCount(professionalId: string): Promise<number> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return 0;
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("professional_id", professionalId);
  return count ?? 0;
}

export async function isFollowing(professionalId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return false;
  const { data } = await supabase
    .from("follows")
    .select("professional_id")
    .eq("professional_id", professionalId)
    .eq("follower_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/* ---------------------------------------------------------------------------
 * Admin
 * ------------------------------------------------------------------------- */

export type ReviewRow = {
  id: string;
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  linkedin_url: string;
  verification_status: VerificationStatus;
  founding_member: boolean;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  niche: FeedNiche | null;
  user: FeedAuthor | null;
};

export async function getReviewQueue(status: VerificationStatus): Promise<ReviewRow[]> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("professional_profiles")
    .select(
      `id, user_id, display_name, headline, bio, linkedin_url, verification_status,
       founding_member, review_note, reviewed_at, created_at,
       niche:niches ( id, name, slug, emoji, accent ),
       user:users!professional_profiles_user_id_fkey ( id, full_name, avatar_url )`,
    )
    .eq("verification_status", status)
    .order("created_at", { ascending: status === "pending" });

  if (error) {
    console.error("[queries] getReviewQueue", error.message);
    return [];
  }
  return (data ?? []) as unknown as ReviewRow[];
}

export async function getVerifiedCount(): Promise<number> {
  const supabase = await createClient();
  // No Supabase project configured — nothing to read.
  if (!supabase) return 0;
  const { count } = await supabase
    .from("professional_profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "verified");
  return count ?? 0;
}
