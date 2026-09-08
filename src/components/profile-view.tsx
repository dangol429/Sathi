"use client";

import Link from "next/link";
import { useState } from "react";
import { Pennant, VerifiedStamp } from "@/components/brand";
import { useMockAuth } from "@/components/mock-auth";
import { Dropdown } from "@/components/dropdown";
import { PostCard, type Flagged, type Given } from "@/components/mock-post-card";
import { PostComposer } from "@/components/post-composer-mock";
import { ProfileAvatar, ProfileCover } from "@/components/profile-images";
import {
  acceptSathiRequest,
  createPost,
  getCertifications,
  getEducation,
  getPostsByAuthor,
  getProjects,
  getSathiCount,
  getWorkExperience,
  giveDhog,
  removeDhog,
  saveProfileImage,
  sendSathiRequest,
} from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import { useSathis, type SathiStatus } from "@/lib/api/use-sathis";
import { POST_TYPES, type PostType } from "@/lib/feed";
import type { MockPerson, MockPost, ProfileEntry } from "@/lib/feed-mock";

/* ===========================================================================
 * A profile.
 *
 * Two panels, like a professional's space. The left one stays deliberately
 * small — who you are, and nothing else. Everything with any depth to it lives
 * behind the switch in the main column, so the identity panel never turns into
 * a résumé sitting permanently down the side of the page.
 *
 * The same body renders anybody's page. Every section is fetched separately
 * through lib/api, and an empty answer is a real answer: a section nobody has
 * filled in simply does not appear rather than showing an empty heading.
 *
 * On your own page that emptiness has one more job — if all four sections come
 * back empty, the page says so and points at /settings. That prompt is driven
 * by the data itself, not by a flag somebody has to remember to clear.
 * ========================================================================= */

type Tab = "posts" | "more";
type Sort = "recent" | "top";

export function ProfileView() {
  const { user, signedIn, logIn } = useMockAuth();

  if (!user) {
    /*
     * Two different empty states, because they are two different situations
     * and telling somebody they are logged out while the header shows their
     * avatar is exactly the contradiction this pass is trying to remove. A
     * real Supabase session is a real session — it just has no profile in this
     * phase, because every profile here is still fixture data.
     */
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <Pennant className="mx-auto h-16 w-auto -rotate-6" />
        <h1 className="mt-6 text-3xl">
          {signedIn ? "Nothing here yet." : "You’re not logged in."}
        </h1>
        <p className="text-ink-soft mt-3 leading-relaxed">
          {signedIn
            ? "Your account is real, but profiles are still mock data in this pass — there is only the demo one. Open it to see the layout."
            : "This page shows your own profile. Log in and it will fill in."}
        </p>
        <button type="button" onClick={logIn} className="btn btn-primary mt-6">
          {signedIn ? "Open the demo profile" : "Log in"}
        </button>
      </div>
    );
  }

  return <ProfileBody person={user} isOwn />;
}

/** Somebody else's page. Same layout, whatever they happen to have filled in. */
export function PersonProfileView({ person }: { person: MockPerson }) {
  const { user } = useMockAuth();
  // Reaching your own page by its public URL should still be your own page.
  return <ProfileBody person={person} isOwn={user?.slug === person.slug} />;
}

function ProfileBody({ person: user, isOwn }: { person: MockPerson; isOwn: boolean }) {
  const [tab, setTab] = useState<Tab>("posts");
  const [sort, setSort] = useState<Sort>("recent");
  const [type, setType] = useState<PostType>("all");
  const [given, setGiven] = useState<Given>({});
  const [flagged, setFlagged] = useState<Flagged>({});

  const { user: viewer, requireAuth, updateUser } = useMockAuth();
  const { statusOf, sathiIds } = useSathis(viewer?.slug);
  /*
   * Pictures picked in this session. Kept here as well as written through
   * lib/api because this component renders from a prop on somebody else's
   * route and from the mock session on your own — an override covers both
   * without the two paths needing different code.
   */
  const [picked, setPicked] = useState<{ avatarUrl?: string; coverUrl?: string }>({});

  const id = user.slug;
  const { data: posts, setData: setPosts } = useAsync<MockPost[]>(
    () => getPostsByAuthor(user.name),
    [],
    [user.name],
  );
  const edu = useAsync<ProfileEntry[]>(() => getEducation(id), [], [id]);
  const exp = useAsync<ProfileEntry[]>(() => getWorkExperience(id), [], [id]);
  const proj = useAsync<ProfileEntry[]>(() => getProjects(id), [], [id]);
  const certs = useAsync<ProfileEntry[]>(() => getCertifications(id), [], [id]);

  const { data: education } = edu;
  const { data: experience } = exp;
  const { data: projects } = proj;
  const { data: certifications } = certs;

  const about = user.details?.about;
  const personal = user.details?.personal;
  // "Nothing yet" and "not back yet" both look like an empty array, and only
  // one of them is worth telling somebody about. Without this the prompt
  // flashes on every profile for as long as the round trip takes.
  const sectionsLoading = edu.loading || exp.loading || proj.loading || certs.loading;
  const hasSections =
    education.length + experience.length + projects.length + certifications.length > 0;
  // Somebody with nothing written up has no second tab to be on.
  const hasMore = Boolean(about) || hasSections;
  const showMore = tab === "more" && hasMore;

  const filtered = type === "all" ? posts : posts.filter((post) => post.type === type);
  // The feed comes back in recency order, so "recent" is the array as-is.
  const visible = sort === "top" ? [...filtered].sort((a, b) => b.dhog - a.dhog) : filtered;

  function toggleDhog(postId: string) {
    const wasGiven = Boolean(given[postId]);
    setGiven((current) => ({ ...current, [postId]: !wasGiven }));
    void (wasGiven ? removeDhog(postId) : giveDhog(postId));
  }

  async function handleCreate(post: MockPost) {
    setPosts((current) => [post, ...current]);
    await createPost(post);
  }

  function setImage(kind: "avatar" | "cover", url: string) {
    const field = kind === "avatar" ? "avatarUrl" : "coverUrl";
    setPicked((current) => ({ ...current, [field]: url }));
    // Keep the header's avatar in step with the profile's.
    updateUser({ [field]: url });
    void saveProfileImage(id, kind, url);
  }

  const avatarUrl = picked.avatarUrl ?? user.avatarUrl;
  const coverUrl = picked.coverUrl ?? user.coverUrl;

  /*
   * Re-read when the connection set changes, so accepting somebody's request
   * anywhere on the screen moves this count without a reload. sathiIds is in
   * the deps rather than the count itself — the count is derived from it.
   */
  const { data: sathiCount } = useAsync<number>(() => getSathiCount(id), 0, [
    id,
    sathiIds.join(","),
  ]);
  const status = statusOf(isOwn ? undefined : id);

  return (
    <>
      <ProfileCover url={coverUrl} isOwn={isOwn} onChange={(url) => setImage("cover", url)} />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[320px_1fr]">
        {/* --- Who you are. Nothing more. ------------------------------- */}
        <aside className="z-sticky lg:sticky lg:top-24 lg:self-start">
          <div className="card -mt-14 p-5">
            <ProfileAvatar
              name={user.name}
              url={avatarUrl}
              isOwn={isOwn}
              onChange={(url) => setImage("avatar", url)}
            />

            <h1 className="mt-3 flex items-center gap-1.5 text-2xl leading-tight">
              {user.name}
              {user.verified ? <VerifiedStamp size={18} /> : null}
            </h1>

            <p className="text-ink-soft mt-1 text-sm">
              {user.role}, {user.city}
            </p>

            {user.tagline ? (
              <p className="text-ink-soft mt-3 text-sm leading-relaxed">{user.tagline}</p>
            ) : null}

            {/* The two numbers worth knowing about somebody, side by side.
                No tier badge — the tier names are still placeholders, and a
                real one has to be decided, not invented. */}
            <div className="border-line mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t pt-4">
              <span className="flex items-baseline gap-2">
                <span className="font-display text-crimson text-2xl font-semibold tabular-nums">
                  {user.lifetimeDhog.toLocaleString("en-US")}
                </span>
                <span className="text-ink-soft text-sm font-semibold">dhog earned</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {sathiCount}
                </span>
                <span className="text-ink-soft text-sm font-semibold">
                  {sathiCount === 1 ? "Sathi" : "Sathis"}
                </span>
              </span>
            </div>

            {isOwn ? (
              <Link href="/settings" className="btn btn-paper btn-sm mt-4 w-full">
                Edit my profile
              </Link>
            ) : (
              <SathiControl
                status={status}
                name={user.name}
                onAdd={() => requireAuth(() => void sendSathiRequest(id))}
                onAccept={() => requireAuth(() => void acceptSathiRequest(id))}
              />
            )}

            {user.linkedinUrl ? (
              <a
                href={user.linkedinUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={`btn btn-paper btn-sm w-full ${isOwn ? "mt-2.5" : "mt-4"}`}
              >
                <LinkedInGlyph />
                LinkedIn
              </a>
            ) : null}
          </div>

          {/* Short and factual. The story goes on the More info tab; this is
              just the handful of things you would put on a card. */}
          {personal ? (
            <section className="card-soft mt-4 p-5">
              <h2 className="eyebrow">Personal details</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                <Detail glyph={<PinGlyph />} label="From">
                  {personal.from}
                </Detail>
                {personal.born ? (
                  <Detail glyph={<CakeGlyph />} label="Born">
                    {personal.born}
                  </Detail>
                ) : null}
                {personal.speaks ? (
                  <Detail glyph={<SpeechGlyph />} label="Speaks">
                    {personal.speaks}
                  </Detail>
                ) : null}
              </dl>
            </section>
          ) : null}
        </aside>

        {/* --- Posts, or the rest of it --------------------------------- */}
        <div className="min-w-0 pt-6">
          {isOwn && !sectionsLoading && !hasSections ? <FillYourDetails /> : null}

          {/* Three tracks so the toggle sits in the middle of the row rather
              than at the start of it: an empty one, the tabs, and the
              controls. Stacks on a narrow screen, where centring the tabs
              against nothing is just centring them. */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="hidden sm:block" aria-hidden />

            <div role="tablist" aria-label="Profile sections" className="flex justify-center gap-2">
              <Segment selected={!showMore} onClick={() => setTab("posts")}>
                Posts
              </Segment>
              {hasMore ? (
                <Segment selected={showMore} onClick={() => setTab("more")}>
                  More info
                </Segment>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              {!showMore ? (
                <>
                  {/* Same two controls as the feed, and the same component. */}
                  <Dropdown
                    label="Show"
                    value={type}
                    onChange={(next) => setType(next as PostType)}
                    options={POST_TYPES.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  />
                  <Dropdown
                    label="Sort"
                    value={sort}
                    onChange={(next) => setSort(next as Sort)}
                    options={[
                      { value: "recent", label: "Recent" },
                      { value: "top", label: "Top" },
                    ]}
                  />
                </>
              ) : (
                <span className="chip border-dashed text-[0.62rem] tracking-[0.12em] uppercase">
                  Mock data
                </span>
              )}
            </div>
          </div>

          {!showMore && isOwn ? (
            <div className="mt-5">
              {/* The same composer the feed uses — not a profile-shaped copy of
                  it. Only on your own page, on the same test that decides
                  whether "Edit my profile" is there. */}
              <PostComposer onPost={handleCreate} placeholder="Post something to your profile…" />
            </div>
          ) : null}

          {!showMore ? (
            visible.length > 0 ? (
              <div className="mt-5 space-y-5">
                {visible.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    given={given}
                    flagged={flagged}
                    onGive={toggleDhog}
                    onFlag={(postId) => setFlagged((c) => ({ ...c, [postId]: true }))}
                  />
                ))}
              </div>
            ) : (
              <div className="card-soft mt-5 p-8 text-center">
                <p className="font-display text-xl">
                  {posts.length === 0 ? "Nothing here yet." : "Nothing of that kind here."}
                </p>
                <p className="text-ink-soft mt-2 text-sm">
                  {posts.length === 0
                    ? "Everything you post collects on this page."
                    : "Try a different kind of post."}
                </p>
              </div>
            )
          ) : (
            <div className="mt-5 space-y-5">
              {about ? (
                <section className="card p-5">
                  <h2 className="eyebrow">About</h2>
                  <p className="prose-post mt-2.5 text-[0.95rem]">{about}</p>
                </section>
              ) : null}

              <Section title="Education" entries={education} />
              <Section title="Work experience" entries={experience} />
              <Section title="Projects" entries={projects} />
              <Section title="Certifications" entries={certifications} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * The one connection control.
 *
 * Four states, and each of them is a different sentence rather than the same
 * button greyed out: you can ask, you are waiting, they are waiting on you, or
 * you are already Sathis. Showing "Add as Sathi" to somebody whose request is
 * sitting in your own notification panel would be the app forgetting what it
 * had already told you.
 */
function SathiControl({
  status,
  name,
  onAdd,
  onAccept,
}: {
  status: SathiStatus;
  name: string;
  onAdd: () => void;
  onAccept: () => void;
}) {
  if (status === "sathi") {
    return (
      <p className="border-jade text-jade mt-4 flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-2 text-sm font-semibold">
        <CheckGlyph />
        Your Sathi
      </p>
    );
  }

  if (status === "outgoing") {
    return (
      <button type="button" disabled className="btn btn-paper btn-sm mt-4 w-full">
        Sathi request sent
      </button>
    );
  }

  if (status === "incoming") {
    return (
      <button type="button" onClick={onAccept} className="btn btn-primary btn-sm mt-4 w-full">
        Accept Sathi request
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={`Add ${name} as a Sathi`}
      className="btn btn-primary btn-sm mt-4 w-full"
    >
      <PlusGlyph />
      Add as Sathi
    </button>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="m5 12.5 4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Shown when all four detail sections come back empty for the person looking
 * at their own page.
 *
 * There is no "has filled in their profile" flag anywhere — the four getters
 * returning nothing is the condition. It cannot get out of step with reality,
 * and it disappears the moment a single row is saved.
 */
function FillYourDetails() {
  return (
    <div className="card border-crimson mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 p-5">
      <div className="min-w-56 flex-1">
        <p className="font-display text-lg leading-tight font-semibold">Fill in your details.</p>
        <p className="text-ink-soft mt-1 text-sm leading-relaxed">
          Your education, work, projects and certifications are all empty. People decide whether an
          answer is worth anything partly by who wrote it.
        </p>
      </div>
      <Link href="/settings" className="btn btn-primary btn-sm">
        Fill your details
      </Link>
    </div>
  );
}

function Segment({
  selected,
  small = false,
  onClick,
  children,
}: {
  selected: boolean;
  small?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`chip transition-colors ${small ? "text-xs" : ""} ${
        selected
          ? "border-line bg-selected text-on-selected"
          : "hover:border-line border-line text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, entries }: { title: string; entries: ProfileEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="card p-5">
      <h2 className="eyebrow">{title}</h2>

      <ul className="mt-3 space-y-4">
        {entries.map((entry) => (
          <li key={entry.title} className="flex gap-3.5">
            {entry.thumbnail ? <ProjectThumb seed={entry.title} /> : null}

            <div className={entry.thumbnail ? "min-w-0 flex-1" : "border-line border-l-2 pl-3.5"}>
              <p className="font-display leading-snug font-semibold">{entry.title}</p>

              {entry.organization || entry.dates ? (
                <p className="text-ink-soft mt-0.5 text-sm">
                  {entry.organization}
                  {entry.organization && entry.dates ? " · " : null}
                  {entry.dates ? <span className="text-ink-faint">{entry.dates}</span> : null}
                </p>
              ) : null}

              {entry.description ? (
                <p className="text-ink-soft mt-1.5 text-sm leading-relaxed">{entry.description}</p>
              ) : null}

              {entry.skills && entry.skills.length > 0 ? (
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {entry.skills.map((skill) => (
                    <li key={skill} className="chip px-2 py-0.5 text-xs">
                      {skill}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Detail({
  glyph,
  label,
  children,
}: {
  glyph: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-ink-faint mt-0.5 shrink-0" aria-hidden>
        {glyph}
      </span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-ink-soft leading-snug">{children}</dd>
      </div>
    </div>
  );
}

/**
 * A generated geometric mark, in the same spirit as the initials avatar: a
 * deterministic placeholder that fills the slot a real screenshot will take,
 * without pretending to be one.
 */
function ProjectThumb({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  hash = Math.abs(hash);

  const palette = [
    "var(--color-crimson)",
    "var(--color-indigo)",
    "var(--color-jade)",
    "var(--color-marigold)",
    "var(--color-turmeric)",
  ];
  const base = palette[hash % palette.length];
  const accent = palette[(hash + 2) % palette.length];
  const rotation = (hash % 4) * 90;

  return (
    <svg
      viewBox="0 0 64 64"
      className="border-line h-16 w-16 shrink-0 rounded-lg border"
      role="img"
      aria-label=""
      aria-hidden
    >
      <rect width="64" height="64" fill="var(--color-paper-deep)" />
      <g transform={`rotate(${rotation} 32 32)`}>
        <circle cx="22" cy="26" r="14" fill={base} opacity="0.85" />
        <rect x="28" y="30" width="26" height="26" fill={accent} opacity="0.75" />
        <path d="M8 56 L28 34 L28 56 Z" fill={base} opacity="0.5" />
      </g>
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CakeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M4 20h16v-6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 16c2 0 2 1.6 4 1.6S10 16 12 16s2 1.6 4 1.6S18 16 20 16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M12 8V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SpeechGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8 8 0 0 1-2.6-.4L4 20.5l1.4-3.7A7.3 7.3 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkedInGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.5h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76v5.69h-4v-5.05c0-1.2-.02-2.75-1.7-2.75-1.7 0-1.96 1.31-1.96 2.66v5.14h-4v-11Z" />
    </svg>
  );
}
