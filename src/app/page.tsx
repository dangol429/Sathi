import Link from "next/link";
import { Pennant, PrayerFlags } from "@/components/brand";
import { HeroCardStack } from "@/components/hero-cards";
import { PostCard } from "@/components/post-card";
import { SamplePostCard, SAMPLE_POSTS } from "@/components/sample-posts";
import {
  getActiveNiches,
  getRecentPosts,
  getVerifiedProfessionals,
  getViewerReactions,
} from "@/lib/queries";

/* ===========================================================================
 * Hero copy, kept in one place because it is still being reworded. Edit here
 * rather than in the JSX below.
 *
 * TODO before launch: have a native speaker read the badge line. It is short
 * enough to be worth a second pair of eyes.
 *
 * Badge alternates:
 *   जेन जी ले नेपाल बनाउँछ  — "Gen Z builds Nepal", more direct about the moment
 *   यो पालो, यहीं           — "this time, right here"
 * Headline alternates:
 *   "Nepal's professionals, answering Nepal's students."
 *   "Ask the Nepalis already doing it."
 *
 * "Bibek" in the subhead is the sample professional used further down the page
 * (Bibek Gurung — product designer, fintech, Lalitpur; see supabase/seed.sql).
 * Swap both together if that example changes. "Dhog" is left unexplained here
 * on purpose; it gets introduced properly once posts and comments exist.
 * ========================================================================= */
const HERO = {
  badge: "भाग्ने होइन, बनाउने हो",
  badgeGloss: "not fleeing, building",
  /*
   * Not a job-placement pitch. Careers are one of the things that happen here,
   * not what the place is for — the headline is about the country talking to
   * itself, and the subhead says who is on the other end of that.
   */
  headline: "Where Nepal asks Nepal.",
  subhead: "Verified Nepalis, in every field, answering real questions from anyone who wants in.",
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;

  const [posts, niches, professionals] = await Promise.all([
    getRecentPosts({ limit: 4 }),
    getActiveNiches(),
    getVerifiedProfessionals({ limit: 5 }),
  ]);
  const reacted = await getViewerReactions(posts.map((post) => post.id));

  return (
    <>
      {denied === "admin" ? (
        <div className="border-crimson bg-crimson-wash text-crimson-deep border-b px-4 py-2 text-center text-sm font-semibold">
          That page is for admins only.
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        {/* Unpositioned in the stack: the content below is what carries a
            z-index, so these sit under it without needing a negative one. */}
        <div className="lattice pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="bg-paper/80 pointer-events-none absolute inset-0" aria-hidden />

        <div className="z-content relative mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14 lg:pt-20">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Pennant className="h-4 w-auto" showEmblems={false} />
              Made in Nepal · Starting with tech
            </p>

            <p className="border-crimson/35 bg-crimson-wash/70 mt-4 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5">
              <span className="font-deva text-crimson-deep text-[0.95rem] leading-none font-semibold">
                {HERO.badge}
              </span>
              <span className="text-ink-soft text-xs leading-none">{HERO.badgeGloss}</span>
            </p>

            <h1 className="mt-4 text-4xl leading-[1.08] font-semibold sm:text-5xl lg:text-[3.4rem]">
              {HERO.headline}
            </h1>

            <p className="text-ink-soft mt-5 max-w-xl text-lg leading-relaxed">{HERO.subhead}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary">
                Join Sathi
              </Link>
              <Link href="/feed?niche=tech" className="btn btn-paper">
                Look around first
              </Link>
            </div>

            <p className="text-ink-faint mt-5 flex items-center gap-2 text-sm">
              <span className="bg-jade inline-block h-2 w-2 rounded-full" aria-hidden />
              {professionals.length > 0
                ? `${professionals.length} verified professional${professionals.length === 1 ? "" : "s"} so far · free, and staying free`
                : "Free to join. No feeds to game, no points to farm."}
            </p>
          </div>

          <HeroCollage />
        </div>

        <PrayerFlags />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Sample posts                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-line bg-paper-soft/70 border-y">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="eyebrow">From the tech space</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">
                {posts.length > 0 ? "What people are saying right now" : "What this looks like"}
              </h2>
            </div>
            <Link href="/feed?niche=tech" className="btn btn-paper btn-sm">
              See everything in tech
            </Link>
          </div>

          {posts.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  reacted={reacted.has(post.id)}
                  revalidatePath="/"
                />
              ))}
            </div>
          ) : (
            <>
              <p className="text-ink-soft mt-3 max-w-xl text-sm">
                Nobody has posted yet. These are examples of the kind of thing the space is for —
                they are not real accounts.
              </p>
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {SAMPLE_POSTS.map((sample) => (
                  <SamplePostCard key={sample.name} sample={sample} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl sm:text-4xl">How it works</h2>
        <p className="text-ink-soft mt-3 max-w-2xl text-lg">
          Four steps, start to finish. Verification is one of them, not the point of the place — the
          point is the answer you get afterwards.
        </p>

        <ol className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Step n="1" title="Sign up" body="Email or Google. Takes a minute. You're in." />
          <Step
            n="2"
            title="Get verified"
            body="Drop your LinkedIn. A real person on our side reads it and decides — no algorithm, no CV, no interview. Usually a day or two."
          />
          <Step
            n="3"
            title="Post"
            body="Ask what you actually want to know, or answer someone who's stuck. Your page collects everything you write."
          />
          <Step
            n="4"
            title="Connect"
            body="Get answers from people doing the job in Kathmandu, Pokhara, or abroad. Earn dhog when your answer actually helps someone."
          />
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Dhog                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-line bg-paper-soft/70 border-y">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div>
              <p className="eyebrow">The one number here</p>
              <h2 className="mt-2 text-3xl sm:text-4xl">What is dhog?</h2>
              <p className="text-ink-soft mt-4 text-lg leading-relaxed">
                Dhog is what someone gives you when your answer actually helped them. It is named
                after the gesture of respect you make to someone you look up to — which is the whole
                point of it.
              </p>
              <p className="text-ink-soft mt-4 leading-relaxed">
                Given freely it means something. Asked for, it would mean nothing at all — so nobody
                here asks. There is no button that requests it and no reminder to return it.
              </p>
            </div>

            <ul className="space-y-4">
              <DhogNote title="Answers are worth more than posts">
                Helping one person properly counts for more here than a post a lot of people happen
                to like. That is the opposite of how most feeds work, and it is deliberate.
              </DhogNote>
              <DhogNote title="The person who asked decides">
                They are the only one who knows whether it helped. When they mark the answer that
                actually got them unstuck, that counts for more than anything else on the site.
              </DhogNote>
              <DhogNote title="Who gives it matters">
                Dhog from a verified professional in your own field carries more than dhog from an
                account made this morning. Verification is a human reading a LinkedIn profile, so a
                pile of fake accounts adds up to almost nothing.
              </DhogNote>
              <DhogNote title="There is no downvote">
                No anti-dhog exists, and nothing anyone does can take yours away. If something is
                unhelpful or wrong you can flag it privately, and a person reads it.
              </DhogNote>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Niches                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="card lattice overflow-hidden p-0">
          <div className="bg-snow/90 p-7 sm:p-9">
            <p className="eyebrow">One niche at a time</p>
            <h2 className="mt-2 text-2xl sm:text-3xl">Tech is open. The rest come later.</h2>
            <p className="text-ink-soft mt-3 max-w-2xl">
              Going wide early is how communities end up shallow everywhere. We would rather one
              field be genuinely good first — then medicine, law, design, civil service, whatever
              people ask for loudest.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {niches.map((niche) => (
                <Link
                  key={niche.id}
                  href={`/feed?niche=${niche.slug}`}
                  className="btn btn-marigold btn-sm"
                >
                  <span aria-hidden>{niche.emoji}</span>
                  {niche.name}
                </Link>
              ))}
              <span className="chip text-ink-faint border-dashed">More niches — not yet</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Pieces
 * ------------------------------------------------------------------------- */

function DhogNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="card-soft p-5">
      <p className="font-display text-lg leading-tight font-semibold">{title}</p>
      <p className="text-ink-soft mt-1.5 text-[0.95rem] leading-relaxed">{children}</p>
    </li>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="card-soft p-6">
      <span className="border-line text-ink font-display flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg font-semibold">
        {n}
      </span>
      <h3 className="mt-4 text-xl">{title}</h3>
      <p className="text-ink-soft mt-2 text-sm leading-relaxed">{body}</p>
    </li>
  );
}

/**
 * Decorative stack of paper cards — gives the hero something to sit against.
 *
 * `isolate` is doing real work here. Everything inside this collage stacks
 * only against its own siblings, and sealing it into its own stacking context
 * is what guarantees that can never again be true of the navbar: no descendant
 * of an isolated element can outrank anything outside it, whatever number it
 * carries. This deck used to reach z-40, tie with the header, and win on
 * document order.
 *
 * The two loose cards carry no z-index at all, so the deck's positive values
 * put them behind it — they are meant to be the edges of other things showing
 * past the pile. The padding is what gives them somewhere to be: without it
 * they can only escape the deck by climbing on top of it.
 */
function HeroCollage() {
  return (
    <div
      className="z-content relative isolate mx-auto hidden w-full max-w-sm pt-12 pb-10 lg:block"
      aria-hidden
    >
      <div className="card bg-paper-deep absolute top-0 -right-8 w-52 rotate-[5deg] p-4">
        <div className="flex items-center gap-2">
          <span className="bg-jade h-2 w-2 rounded-full" />
          <p className="text-xs font-bold tracking-wider uppercase">Verified</p>
        </div>
        <p className="font-display mt-2 text-lg leading-tight font-semibold">
          Prakriti, data · Dharan → Berlin
        </p>
        <p className="text-ink-soft mt-1 text-xs">&ldquo;It is mostly SQL. Genuinely.&rdquo;</p>
      </div>

      <HeroCardStack />

      <div className="card bg-marigold-wash absolute bottom-0 -left-8 w-48 -rotate-[5deg] p-4">
        <p className="font-deva text-sm font-semibold">कसैले त भन्नुपर्‍यो नि</p>
        <p className="text-ink-soft mt-1 text-xs">Somebody has to tell you.</p>
      </div>
    </div>
  );
}
