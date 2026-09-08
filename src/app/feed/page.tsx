import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActiveNow, DhogLeaderboard } from "@/components/feed-rail";
import { FeedShell } from "@/components/feed-shell";
import { DismissibleBanner } from "@/components/toast";
import { getNiche } from "@/lib/api";
import { feedHref, isPostType } from "@/lib/feed";

/* ===========================================================================
 * The feed. One route for every niche.
 *
 * /feed                          everything, newest first
 * /feed?niche=tech               a category — a real, linkable URL
 * /feed?sort=trending            same posts, most dhog first
 * /feed?niche=tech&type=question
 *
 * There is deliberately no page per niche: opening a second niche is one row
 * in the niches table and nothing else.
 *
 * Three columns: nav, feed, rail. The nav and the feed are one client
 * component (they share a sort and a filter); the rail is static and sticky.
 *
 * UI PASS: everything on this page is read through lib/api, which is still
 * answering from lib/feed-mock. No Supabase queries, no presence, no reaction
 * writes — swapping this over is editing lib/api, not this route.
 * ========================================================================= */

type FeedParams = {
  niche?: string;
  type?: string;
  sort?: string;
  welcome?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<FeedParams>;
}): Promise<Metadata> {
  const { niche: slug } = await searchParams;
  const niche = await getNiche(slug);

  return {
    title: niche ? `${niche.name} — the feed` : "The feed",
    description: "Questions, career stories and openings from verified professionals in Nepal.",
    alternates: { canonical: feedHref({ niche: niche?.slug }) },
  };
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<FeedParams> }) {
  const { niche: slug, type: rawType, sort, welcome } = await searchParams;

  // An unknown ?niche= is a broken link, not an empty feed — say so.
  const niche = await getNiche(slug);
  if (slug && !niche) notFound();

  return (
    <>
      {welcome ? (
        <DismissibleBanner>
          You&rsquo;re in. Follow a few people and ask them something.
        </DismissibleBanner>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)_300px] lg:gap-8 lg:py-9">
        {/* Renders the left nav and the feed column as two grid children. */}
        <FeedShell
          initialView={sort === "trending" ? "trending" : "home"}
          initialNiche={niche?.slug ?? null}
          initialType={isPostType(rawType) ? rawType : "all"}
        />

        {/* Stays put while the feed scrolls. `self-start` matters: a stretched
            grid item is as tall as the row and has nowhere to stick to. */}
        <aside className="z-sticky space-y-5 lg:sticky lg:top-20 lg:self-start">
          <ActiveNow />
          <DhogLeaderboard />
        </aside>
      </div>
    </>
  );
}
