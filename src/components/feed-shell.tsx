"use client";

import { useState } from "react";
import { FeedNav, type NavView } from "@/components/feed-nav";
import { PostCard, type Flagged, type Given, type Reposted } from "@/components/mock-post-card";
import { Dropdown } from "@/components/dropdown";
import { useMockAuth } from "@/components/mock-auth";
import { PostComposer } from "@/components/post-composer-mock";
import {
  createPost as apiCreatePost,
  deletePost as apiDeletePost,
  editPost as apiEditPost,
  getFeedPosts,
  getNiches,
  getReposts,
  getSathis,
  giveDhog,
  removeDhog,
  repost as apiRepost,
  unrepost as apiUnrepost,
} from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import { useSathis } from "@/lib/api/use-sathis";
import { buildTimeline, type RepostEntry } from "@/lib/repost";
import type { MockNiche, MockPerson, MockPost } from "@/lib/feed-mock";
import { labelForType, POST_TYPES, type PostType } from "@/lib/feed";

/* ===========================================================================
 * The feed, running on mock data.
 *
 * Owns everything the page is currently doing: which sort, which niche, which
 * post type, and who has been given dhog. All of it is component state that
 * goes nowhere — no fetch, no server action. The point of this pass is to
 * click around and decide whether the shape is right.
 *
 * Sort and niche are mirrored into the query string so a view is still
 * linkable, but with history.replaceState rather than a route change: a real
 * navigation would throw away the reaction state this pass exists to poke at.
 * ========================================================================= */

/**
 * Every mock post is a tech post — MockPost carries no niche of its own — so
 * choosing a category drives the nav, the heading and the URL but cannot thin
 * the list yet. It starts filtering the day posts know which niche they are in.
 */

/** Whose posts the feed is showing. Independent of kind and of order. */
type Audience = "all" | "sathis";

export function FeedShell({
  initialView,
  initialNiche,
  initialType,
}: {
  initialView: NavView;
  initialNiche: string | null;
  initialType: PostType;
}) {
  const [view, setView] = useState<NavView>(initialView);
  const [niche, setNiche] = useState<string | null>(initialNiche);
  const [type, setType] = useState<PostType>(initialType);
  const { data: posts, setData: setPosts, reload } = useAsync<MockPost[]>(getFeedPosts, []);
  const { data: niches } = useAsync<MockNiche[]>(getNiches, []);

  /*
   * Who counts as a Sathi, and their posts. Re-read whenever the connection
   * set changes, so accepting a request in the notification panel widens this
   * feed straight away rather than at the next reload.
   */
  const { user, requireAuth } = useMockAuth();
  const { sathiIds } = useSathis(user?.slug);
  const { data: sathis } = useAsync<MockPerson[]>(getSathis, [], [sathiIds.join(",")]);
  const [audience, setAudience] = useState<Audience>("all");
  const [given, setGiven] = useState<Given>({});
  const [flagged, setFlagged] = useState<Flagged>({});
  const [menuOpen, setMenuOpen] = useState(false);

  /*
   * Reposts are read back rather than guessed at, because pressing the button
   * puts a card in the feed — the pressed state and the banner have to agree
   * with the store, not with a local boolean that resets on the next fetch.
   */
  const { data: repostEntries, setData: setRepostEntries } = useAsync<RepostEntry[]>(
    getReposts,
    [],
  );
  const reposted: Reposted = {};
  for (const entry of repostEntries) {
    if (entry.repost.bySlug === user?.slug) reposted[entry.post.id] = true;
  }

  /** Optimistic like dhog, but the entry is what moves, not just a number. */
  function toggleRepost(id: string) {
    const post = posts.find((candidate) => candidate.id === id);
    if (!post || !user) return;

    if (reposted[id]) {
      setRepostEntries((current) =>
        current.filter((entry) => !(entry.post.id === id && entry.repost.bySlug === user.slug)),
      );
      void apiUnrepost(id);
      return;
    }

    setRepostEntries((current) => [
      {
        post,
        repost: {
          id: `repost-local-${Date.now()}`,
          postId: id,
          by: user,
          bySlug: user.slug,
          postedAt: "just now",
        },
      },
      ...current,
    ]);
    void apiRepost(id);
  }

  /** Move to a new view and keep the URL in step with it. */
  function apply(next: Partial<{ view: NavView; niche: string | null; type: PostType }>) {
    const merged = { view, niche, type, ...next };
    setView(merged.view);
    setNiche(merged.niche);
    setType(merged.type);
    setMenuOpen(false);

    const url = new URL(window.location.href);
    setParam(url, "niche", merged.niche);
    setParam(url, "type", merged.type === "all" ? null : merged.type);
    setParam(url, "sort", merged.view === "trending" ? "trending" : null);
    window.history.replaceState(null, "", url);
  }

  /**
   * Optimistic: the count moves now and the write goes out behind it. Waiting
   * on a round trip to acknowledge a thank-you would make the whole thing feel
   * broken.
   */
  function toggleDhog(id: string) {
    const wasGiven = Boolean(given[id]);
    setGiven((current) => ({ ...current, [id]: !wasGiven }));
    void (wasGiven ? removeDhog(id) : giveDhog(id));
  }

  async function handleCreate(post: MockPost) {
    setPosts((current) => [post, ...current]);
    await apiCreatePost(post);
  }

  async function handleEdit(id: string, content: string) {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, content, editedAt: "just now" } : post)),
    );
    await apiEditPost(id, content);
  }

  async function handleDelete(id: string) {
    setPosts((current) => current.filter((post) => post.id !== id));
    await apiDeletePost(id);
    reload();
  }

  function flag(id: string) {
    setFlagged((current) => ({ ...current, [id]: true }));
  }

  /*
   * Two independent narrowings, deliberately not folded into one control:
   * "what kind of post" and "whose posts" are different questions, and people
   * want to change one without losing their answer to the other.
   *
   * Matched on the author's name because that is what a MockPost carries. It
   * becomes an author id join the day posts are real.
   */
  const sathiNames = new Set(sathis.map((person) => person.name));
  const byAudience =
    audience === "sathis" ? posts.filter((post) => sathiNames.has(post.author.name)) : posts;
  const filtered = type === "all" ? byAudience : byAudience.filter((post) => post.type === type);

  // Trending sorts on the posted count, not the count including your own click,
  // so giving dhog never makes a card jump out from under the cursor.
  const ordered = view === "trending" ? [...filtered].sort((a, b) => b.dhog - a.dhog) : filtered;

  /*
   * Reposts are woven in after filtering, so a reposted question cannot slip
   * past a "show me opportunities" filter, and a post being passed on takes
   * the slot rather than appearing twice. Trending re-sorts on the underlying
   * post, since a repost carries no dhog of its own.
   */
  const orderedIds = new Set(ordered.map((post) => post.id));
  const timeline = buildTimeline(ordered, repostEntries, (post) => orderedIds.has(post.id));
  const visible =
    view === "trending" ? [...timeline].sort((a, b) => b.post.dhog - a.post.dhog) : timeline;

  const heading = view === "trending" ? "Trending" : "Latest";
  const scope = type === "all" ? null : labelForType(type);

  return (
    <>
      <FeedNav
        view={view}
        niche={niche}
        categories={niches.map((n) => ({
          slug: n.slug,
          name: n.name,
          emoji: n.emoji,
          count: posts.length,
        }))}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onHome={() => apply({ view: "home", niche: null })}
        onTrending={() => apply({ view: "trending" })}
        onCategory={(slug) => apply({ niche: slug })}
      />

      <div className="min-w-0">
        {/* The visible heading row is gone — a title, a counter and a mock-data
            chip were three pieces of furniture above the thing people came to
            read. The page still needs one heading for its outline, so it keeps
            one nobody has to look at. */}
        <h1 className="sr-only">
          {heading}
          {scope ? ` · ${scope}` : ""}
        </h1>

        <PostComposer onPost={handleCreate} />

        {/* Show on the left, Sort on the right: they filter and order the
            same list, so they belong at either end of it rather than huddled
            together in the middle. */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {/* Whose posts, next to what kind of posts — it narrows the same
              list, so it belongs in the same row rather than in a bar of its
              own. Filtering to your Sathis needs a you, so a visitor pressing
              it gets the login modal like every other action. */}
          <div role="tablist" aria-label="Whose posts" className="flex items-center gap-1">
            <AudienceTab selected={audience === "all"} onClick={() => setAudience("all")}>
              All
            </AudienceTab>
            <AudienceTab
              selected={audience === "sathis"}
              onClick={() => requireAuth(() => setAudience("sathis"))}
            >
              Sathis
            </AudienceTab>
          </div>

          <Dropdown
            label="Show"
            value={type}
            onChange={(next) => apply({ type: next as PostType })}
            options={POST_TYPES.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />

          {/*
           * The same state the left rail's Home/Trending drives. Two controls
           * for one thing is fine; two controls disagreeing about it is not.
           */}
          <Dropdown
            label="Sort"
            value={view}
            onChange={(next) => apply({ view: next as NavView })}
            options={[
              { value: "home", label: "Recent" },
              { value: "trending", label: "Top" },
            ]}
          />
        </div>

        {audience === "sathis" && visible.length === 0 && posts.length > 0 ? (
          <div className="card-soft mt-4 p-6 text-center">
            <p className="font-display text-lg">Nothing from your Sathis yet.</p>
            <p className="text-ink-soft mt-1.5 text-sm">
              Switch to All, or add a few more people as Sathis.
            </p>
          </div>
        ) : null}

        {visible.length > 0 ? (
          <div className="mt-4 space-y-5">
            {visible.map((entry) => (
              <PostCard
                key={entry.key}
                post={entry.post}
                repostedBy={entry.repost}
                given={given}
                flagged={flagged}
                reposted={reposted}
                onGive={toggleDhog}
                onFlag={flag}
                onRepost={toggleRepost}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="card-soft mt-5 p-8 text-center">
            <p className="font-display text-xl">Nothing filed under {labelForType(type)} yet.</p>
            <button
              type="button"
              onClick={() => apply({ type: "all" })}
              className="btn btn-paper btn-sm mt-5"
            >
              Show everything
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function setParam(url: URL, key: string, value: string | null) {
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
}

/**
 * All / Sathis. A pair of chips rather than a dropdown, because there are two
 * options and one of them is the default — a dropdown would hide half the
 * control behind a click.
 */
function AudienceTab({
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
      className={`chip text-sm transition-colors ${
        selected
          ? "border-line bg-selected text-on-selected"
          : "border-line text-ink-soft hover:border-line"
      }`}
    >
      {children}
    </button>
  );
}
