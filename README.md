# Sathi (साथी)

A community platform connecting **verified working professionals in Nepal** with students and
curious learners — one niche at a time. Tech first.

This repo is the v1 scaffold: schema, both auth paths, the manual verification queue, and working
versions of every page listed below.

---

## Stack

| Layer    | Choice                                       |
| -------- | -------------------------------------------- |
| Framework| Next.js 15 (App Router) + TypeScript          |
| Styling  | Tailwind CSS v4 (CSS-first `@theme` tokens)   |
| Backend  | Supabase — auth, Postgres, storage            |
| Deploy   | Vercel                                        |

Mutations are Server Actions; reads are Server Components. There is no client-side data fetching
layer to keep in sync.

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Point at a Supabase project

```bash
cp .env.local.example .env.local
```

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. **Server-only** — it bypasses RLS entirely, so it must never be prefixed `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your domain in production |
| `NEXT_PUBLIC_USE_MOCK_DATA` | `true` (or unset) runs the feed, profiles, settings and onboarding step 3 on fixtures; `false` takes the Supabase branch. See [Mock or real](#mock-or-real) |

### 3. Create the schema

**Local (Docker required):**

```bash
npx supabase start      # boots Postgres, Auth, Storage on :54321
npx supabase db reset   # runs migrations + supabase/seed.sql
```

`supabase start` prints the local URL and anon key — put those in `.env.local`.

**Hosted:**

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push
```

Or paste the files in `supabase/migrations/` into the SQL editor in order.

### 4. Run it

```bash
npm run dev
```

### 5. Make yourself an admin

`/admin/review` is gated on `users.role = 'admin'`. There is no UI for granting it — that is
deliberate. Sign up normally, then in the SQL editor:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

### Google OAuth

Both signup paths offer Google. Enable it in Supabase → Authentication → Providers → Google, and
add `<your-site>/auth/callback` to the allowed redirect URLs. Until you do, the email/password
forms still work.

---

## Local demo accounts

`supabase/seed.sql` runs on `npx supabase db reset`. Every password is `password`.

| Email | Who |
| --- | --- |
| `admin@sathi.test` | Admin — can open `/admin/review` |
| `aayusha@sathi.test` | Verified professional, founding member, has posts |
| `bibek@sathi.test` | Verified professional, founding member |
| `prakriti@sathi.test` | Verified professional, founding member |
| `sandesh@sathi.test` | **Pending** — sits in the review queue so you can approve them |
| `nirjala@sathi.test` | Student |

---

## Routes

| Route | What it is |
| --- | --- |
| `/` | Landing: hero, how verification works, sample posts |
| `/signup` | The only signup — email or Google, no persona question |
| `/login` | Shared login |
| `/onboarding` | The 3-step wizard everyone does after signing up |
| `/onboarding/professional` | Profile builder — bio, links, niche (verified only) |
| `/onboarding/professional/first-post` | Templated first-post prompt |
| `/pending` | "Under review" holding page; also shows a rejection + reason |
| `/admin/review` | Manual approval queue (admins only) |
| `/feed` | The feed. `?niche=tech` picks a category, `?type=question\|career-story\|opportunity\|discussion` a kind of post, `?sort=trending` orders by dhog. **Currently renders mock data — see below.** |
| `/profile` | Your own profile — same two-panel shape as a space. **Mock auth only.** |
| `/profile/[id]` | Anyone else's profile, from the people search or a byline. **Mock directory.** |
| `/settings` | The one profile editor — name, role, location, tagline, LinkedIn, and the four detail sections. Signed in only |
| `/space/[professional_id]` | A professional's page — identity rail left, feed right |
| `/post/[id]` | Post detail + comment thread |
| `/auth/callback` | OAuth / magic-link code exchange |

`/space/[professional_id]` accepts either the `professional_profiles.id` (as specced) or the
space's slug, so `/space/aayusha-shrestha` works too.

There is no page per niche. `/feed?niche=tech` is a real, linkable, indexable URL, and opening a
second niche is one row in `niches` — no new route, no new file.

`/feed` is three columns: nav, feed, rail. The nav and the feed are one client component
(`feed-shell.tsx`) because they share a sort and a filter; the rail is static and sticks below
the header while the feed scrolls. Below `lg` the nav collapses to a drawer and the rail stacks
under the feed. Home and Trending are the same posts in a different order — Trending is a sort,
not a page — and Categories is the only niche filter on the page.

`/feed` is currently a **UI pass on mock data**: it makes no Supabase queries at all. Everything
on it — posts, leaderboard, niches, the hardcoded 142 online — is read through `src/lib/api`,
which is answering from `src/lib/feed-mock.ts`. Giving dhog is a toggle: press once to give,
press again to take it back. The page carries a "Mock data" chip so it cannot be mistaken for
the real thing.

---

## Mock or real

`NEXT_PUBLIC_USE_MOCK_DATA` decides which data the app runs on, and it is read in exactly one
place — `src/lib/config.ts`. No component checks it.

Every read and write goes through a function in **`src/lib/api/`**. Nothing outside that folder
imports the fixtures; the only things `src/lib/feed-mock.ts` still exports to components are
TypeScript types. Each function has the same two-branch shape:

```ts
export async function getFeedPosts(): Promise<MockPost[]> {
  if (USE_MOCK_DATA) return mockDelay(store.posts);
  return notWired("getFeedPosts");   // ← the Supabase query goes here
}
```

Three things follow from that:

- **The mock branch is async, and slightly slow on purpose** (`mockDelay`, ~180ms). Without it
  every call resolves in the same tick and components quietly get written as if the data were
  already in memory — which breaks the day a network is underneath.
- **Switching a feature to Supabase is one function body**, not a hunt through the tree.
- **`NEXT_PUBLIC_USE_MOCK_DATA=false` fails loudly.** The unwritten branches throw a named error
  saying which function is not wired, rather than rendering an empty feed that looks like a bug
  in the UI.

Writes made in the mock branch — a post, a job added in settings — live in a module-level store
that lasts as long as the tab. That is why a post written on the feed now shows up on your
profile, and why both are gone after a reload.

The **profile-detail readers** (`getEducation`, `getWorkExperience`, `getProjects`,
`getCertifications`) return an empty array for anyone who has not filled that section in. That
emptiness is load-bearing: it is what the "fill in your details" prompt on your own profile keys
off, so the prompt cannot get out of step with the data and disappears the moment one row is
saved.

---

## Who is signed in

**Browsing is open. Acting is not.** `/feed`, `/profile/[id]`, every post and every comment
thread render in full for someone with no account — that is the whole point of "Look around
first" on the landing page. What needs a session is doing something: giving dhog, replying,
searching for people, and posting. Each of those calls `requireAuth()`, which either runs the
action or opens the login modal. A visitor never gets a dead click and never gets a control that
looks available and then refuses.

The gate lives as close to the action as it can. `requireAuth` is inside `DhogControl` itself
rather than in the three places that render one, because a check that each caller has to
remember is a check that eventually gets forgotten.

**Kura** — कुरा, "talk" — is the messages widget in the bottom-right corner, and it is on the
same gate: a visitor has no inbox, so it renders nothing at all. See [Kura](#kura) below.

**Every image goes through a crop step** before anything uses it — profile picture (1:1), cover
(3:1), post attachment (freeform). `useImageCrop()` in `src/components/image-crop.tsx` owns it,
the ratio is enforced while dragging rather than applied at the end, and the result is a canvas
drawn at the source image's natural resolution. Applying a file the instant it is picked meant a
portrait photo dropped into a 3:1 banner was just a badly cut portrait photo.

---

## Sathis

**A Sathi is a mutual connection** — साथी, "friend" — and it is the only relationship the
product has. There is no follow, no one-way anything.

It is stored as **undirected pairs of profile slugs** (`MOCK_SATHI_EDGES`), not as a list of
friends hanging off each person. There is no way to be somebody's Sathi without them being
yours, and a pair cannot get half-written the way two arrays can drift apart. Every Sathi count
on every profile is derived from those pairs, so no number can disagree with the connections
themselves.

`Add as Sathi` sits on any profile that is not yours. It has four states and each is a different
sentence rather than the same button greyed out — you can ask, you are waiting (`Sathi request
sent`, disabled), they are waiting on you (`Accept Sathi request`), or you are already connected.
Showing "Add as Sathi" to somebody whose request is sitting in your own notification panel would
be the app forgetting what it had already told you.

**Incoming requests are answered in the notification bell**, with Accept and Decline inline. A
separate page to hold two buttons is a page that exists to hold two buttons. The row stays after
being answered, saying what happened, rather than vanishing under the cursor.

One accept has to move four things at once: the button on that profile, which Kura list their
thread sits in, whether their posts pass the feed's Sathis filter, and two Sathi counts. Rather
than have each poll, **a connection write notifies and everything re-reads** —
`subscribeSathis()` in `src/lib/api/`, consumed through the `useSathis()` hook. That is the shape
a Realtime subscription takes anyway, so the components are already written for it.

The feed's **All / Sathis** toggle sits beside Show and Sort rather than replacing them: "what
kind of post" and "whose posts" are different questions, and people want to change one without
losing their answer to the other.

### Kura

Deliberately the old Facebook/LinkedIn shape rather than a messages page. **The list is one
panel; opening a conversation opens another panel beside it**, and the list stays where it is.
Several threads can be open at once along the bottom of the screen, each closed on its own.
Nothing navigates, because reading a message should not cost you the page you were on — and
neither should reading three. Every name and avatar in an open panel links to that person's
profile: opening a chat with somebody must never be the thing that stops you looking at who
they are.

**Anyone may message anyone.** That is never blocked. What being a Sathi changes is only which
of two lists the message lands in for the person receiving it:

| List | Who |
| --- | --- |
| **Chats** | the other person is one of your Sathis |
| **Requests** | they are not, yet |

There is no "accept this request" button — **replying to something in Requests is the whole of
accepting it**. And which list a thread is in is not stored anywhere; it is derived from the
connection, so accepting somebody's Sathi request moves their thread across on its own and the
two can never disagree.

The unread badge on the Requests tab is local to Kura and deliberately separate from the
notification bell, which counts other things entirely — dhog, replies, and Sathi requests.

**There is one answer to "is anyone signed in?", and it is `signedIn` from `useMockAuth()`.**
Nothing else in the tree may work it out for itself.

That matters because there are two ways to have a session during this phase — a real Supabase
cookie, and the mock one in React state — and reading them separately caused a real bug: the
header would show an avatar to somebody who had just pressed Log out. Mock "Log out" cleared the
mock session, the real cookie underneath was untouched, and the header simply fell through to
showing that identity instead, with no way left to get rid of it. Two sources, one header, no
single place that could answer the question.

So:

- `getViewer()` runs **once**, in the root layout, before anything renders. Its result is handed
  to `MockAuthProvider` as `hasRealSession`. Nothing reads a cookie or storage on the client, and
  there is no window in which the UI draws an avatar first and finds out afterwards.
- `signedIn = mock session || real session`.
- **Log out ends everything that is live** — the mock session in state, and the Supabase cookie
  via the `signOut` server action. One control, one meaning.
- No session means the logged-out header, Log in / Join, with no avatar and no bell.

---

## Signing up

**One door.** `/signup` takes an email or a Google account and nothing else — no "are you a
student or a professional", no branching. It drops straight into `/onboarding`.

**`/onboarding` is the same three steps for everybody**, held in one client component
(`onboarding-wizard.tsx`) and written in a single submit at the end:

1. **About** — the name to show, "what best describes you right now?" (descriptive; nothing
   branches on the answer), and an optional LinkedIn URL offered to everyone.
2. **Goals** — what you are hoping to get here, and which niche.
3. **Your details** — quick-add fields for education, work experience, projects and
   certifications. Every row is optional, nothing here gates anything, and Finish works on an
   empty step.

Step 3 renders the same `ProfileDetailSection` components `/settings` does, deliberately:
filling something in at signup and filling it in a month later must not be two forms with two
different ideas of what a job is. It also writes as you go rather than at the end, because these
are discrete rows and losing a typed-out role to a Save button nobody pressed is the worst
outcome for a form most people did not want to fill in.

Steps 1 and 2 are still held in the browser and submitted once, at the end. It ends on `/feed`.

**LinkedIn is a badge, not a gate.** Submitting one from step 1 inserts the same
`professional_profiles` row with `verification_status = 'pending'` that the old professional
application created, and the review queue is untouched. What changed is that waiting no longer
holds anyone anywhere: `landingRouteFor()` sends pending accounts to the feed, and `/pending`
is a page you can visit to check rather than one you get parked on. Skipping it is fine —
`/settings` is where you add it later.

An admin opens `/admin/review`, reads the LinkedIn URL, and approves or rejects. Approval calls
`approve_professional()`, which in one transaction:

1. sets `verification_status = 'verified'`,
2. sets `founding_member = true` while founding slots remain (first 100),
3. promotes `users.role` to `professional`,
4. creates their `spaces` row with a unique slug.

They then land on the profile builder → first-post prompt → their space. That post-approval
pair is gated on the profile still having no bio, not on `users.onboarded`, which the unified
onboarding now sets for everyone.

**There is no automated LinkedIn verification.** The only check is a person opening the link.

---

## Schema

```
niches ──┬─< user_niches >── users ──┬─< posts >──┬─< comments
         │                            │            └─< reactions
         └─< professional_profiles ───┤
                    │                 └─< follows
                    └── spaces ──< posts
```

- **`niches`** — seeded with `tech` only. Opening a second niche is one insert.
- **`users`** — mirror of `auth.users`, filled by an `on_auth_user_created` trigger.
- **`professional_profiles`** — one per user; holds the LinkedIn URL, verification state, founding
  flag, and a `links` jsonb array.
- **`spaces`** — exactly one per verified professional, created on approval.
- **`posts`** — written only by the professional who owns the space. Carries `post_type`
  (question / career_story / opportunity / discussion).
- **`comments`** — any signed-in user.
- **`reactions`** — one row per (user, target), and the dhog ledger's main input. A trigger
  resolves `giver_weight_tier`, `weight` and `receiver_id` at insert; no client can set them.
- **`flags`** — the private "not helpful" signal. Separate from reactions entirely: no weight,
  no count, invisible to everyone but the reporter and the admins.
- **`dhog_awards`** — manual admin grants for hosting a session or an event. No automation.
- **`dhog_lifetime` / `dhog_weekly`** — plain views over `dhog_ledger`. Computed on read.
- **`follows`**, **`user_niches`** — reader-side graph.
- **`onboarding_responses`** — one row per user: the self-description, the goals, and any first
  contribution written in step 3. Owner-only under RLS (and admins), because unlike the rest of
  `public.users` none of it is anybody else's business.

### Dhog

Dhog is what someone gives you when your answer actually helped. Two rules come straight from
what the word means, and both are enforced in the database rather than left to the UI:

**There is no anti-dhog.** No reaction can carry a negative weight (`check (weight >= 0)`), and
nothing any user does can reduce someone else's total. "Not helpful" is a `flags` row that routes
to a human, is never counted, and is invisible to everyone else. An admin can hide the content —
moderation, not a score change.

**Nobody solicits it.** There is no "request dhog" state, no reciprocity link between two
reactions, and no notification that nudges anyone to give it back. Dhog freely given is respect;
dhog demanded would be the opposite, which is the whole point of the name.

What a gift is worth is decided at write time by `resolve_dhog_weight()`, from: who is giving
(verified in-field → verified → unverified → nothing at all for an account under a week old or
with no history of its own), what it is attached to (an answer is worth several times a post; a
question earns a little, so good questions are not invisible but cannot be farmed), how many
times that same pair has already traded in 30 days, and two caps — per thread per day for the
receiver, per day for an unverified giver.

**There is no accepted answer.** Marking one needs a control, a rule about who may press it, a
badge, and an explanation of what the badge means — for an outcome dhog already produces on its
own. Top-level comments are ordered by the dhog they have been given, so the answer that helped
people rises to the top with nothing to adjudicate. Replies stay chronological under their
parent, because a conversation read out of order is not a conversation.

**The multipliers live only in the migration.** They are not mirrored into `src/lib/dhog.ts` and
never reach the browser: `reactions.weight` has no select grant, and the UI only ever renders a
finished total. Publishing the formula is the fastest way to teach people to game it.

Two totals, on purpose. Lifetime never decays and is the credential on a profile. Weekly is a
rolling seven days and is the only thing the leaderboard reads, so the board stays winnable by
someone who joined last month.

### Security posture

Two things are enforced by the database, not by trusting the client:

1. **Emails are not readable.** `select` on `public.users` is granted per-column with `email`
   excluded. This means `select('*')` on that table will fail — always name columns.
2. **Nobody can verify themselves.** `verification_status` and `founding_member` have no
   `insert`/`update` grant for `anon` or `authenticated` at all. Only the `SECURITY DEFINER`
   RPCs `approve_professional()` / `reject_professional()` can write them, and each re-checks
   `is_admin()` inside the database.
3. **Nobody can decide what their own dhog is worth.** The insert grant on `reactions` names
   only `(user_id, post_id, comment_id, type)`. `weight`, `giver_weight_tier` and
   `receiver_id` are set by a trigger and are not selectable, so neither the value nor the
   arithmetic behind it is reachable from a client.

RLS is on for every table. `is_admin()` is `SECURITY DEFINER` specifically so policies on
`public.users` can call it without recursing into their own policy.

---

## Design

Not a Tailwind template. The visual language is Nepali print — lokta paper, risograph posters,
passport stamps, prayer flags:

- **Paper, not white** (`#FBF3E4`) with warm ink (`#2A1B14`); no pure black or blue-grey anywhere.
- **Flag crimson `#C8102E`** and **flag indigo `#152A63`** carry the structure; **sayapatri
  marigold `#E9A227`** is the accent.
- **Hard offset shadows** (`4px 4px 0`) instead of soft blur — printed blocks, not floating cards.
- **The double pennant** (`<Pennant />`) is the wordmark and the verified marker.
- **Verification reads as a rubber stamp**, rotated a couple of degrees off true.
- **The lungta rail** — five prayer-flag colours — sits at the top of every page.
- **A Himalaya ridge** closes the footer; a **marigold garland** divides sections.
- Type is Fraunces (display) + Plus Jakarta Sans (body) + Mukta (Devanagari).

Tokens live in `src/app/globals.css`; the motifs are in `src/components/brand.tsx`.

### Light and dark

Every colour is a custom property. `:root` holds the light palette as semantic
properties — `--bg`, `--surface`, `--text-primary`, `--text-secondary`,
`--on-accent`, `--accent-crimson`, `--accent-indigo`, `--accent-marigold` and the
rest — and `:root[data-theme="dark"]` redefines the same names. The `@theme` block
maps Tailwind's `--color-*` tokens onto those properties rather than carrying hexes
of its own, so `bg-paper` or `text-ink-soft` follow the theme automatically and **no
component has a dark variant**. Anything built after this gets dark mode for free.

Three properties exist only for the theme switch and are worth knowing about:

- **`--on-accent`** — text sitting on a filled accent. It is not the same thing as
  the surface colour; they only coincide in light mode. Using `--surface` there would
  put near-black text on crimson buttons in dark mode.
- **`--line-strong`** and **`--shadow-hard`** — the ink-weight border and the hard
  offset shadow. On a dark ground the text colour is off-white, so borrowing it for
  both would turn every card into a white outline with a white drop shadow.

Dark is flat rather than lit: four neutral levels one shade of lightness apart
(`--bg` → `--bg-soft` → `--surface` → `--surface-elevated`, with `--line-strong` as
the border) and exactly one saturated colour allowed to carry the energy — crimson,
on primary buttons and the given-dhog state. Everything else is muted. There are no
gradients, no glow and no drop shadows in dark: `--shadow-hard` is `transparent`, the
body's radial wash is switched off, and the lattice texture is flattened, because all
three read as a light source that is not there.

Two more properties earn their place for the same reason `--on-accent` does:

- **`--selected-bg` / `--on-selected`** — an active filter or nav item. Selection is
  structural, not accent: components used to fill these with `bg-ink`, which in dark
  meant a **white slab**, and was the single biggest thing making pages look untouched
  by the theme.
- **`--scrim`** — the wash behind a modal. Always dark in both themes; a light scrim
  over a dark page just fogs it.

`--on-accent` is dark in dark mode: `#e7e3dc` on the crimson is only 3.0:1, and the
other way round is 4.7:1, which passes AA.

The default border lives in `@layer base`. Unlayered rules beat every layer in
Tailwind v4, so a bare `* { border-color }` silently overrides `.card`'s own border and
flattens the ink-weight edge the design is built on.

**`cursor: pointer` is set once, in `@layer base`**, by tag and by ARIA role — `button`,
`a[href]`, `[role="menuitem"]`, `[role="option"]`, `[role="tab"]` and the rest — because half
the controls here are divs and spans doing a button's job inside a listbox or a menu. Tailwind's
reset puts `cursor: default` on `button`, so without this rule every plain `<button>` in the
tree was missing it and the fix kept being remembered per component and forgotten. It sits in
`@layer base` so `.btn:disabled` can still say `not-allowed` and win.

### Layering

**There is one z-index scale, in `:root`, and no component invents a number.**

| Token | Value | What lives there |
| --- | --- | --- |
| `--z-content` | 1 | ordinary page content, cards, the hero deck |
| `--z-sticky` | 10 | sticky rails and nav, the mobile drawer trigger |
| `--z-header` | 20 | the navbar — above all page content |
| `--z-dropdown` | 30 | menus, popovers, search results, the notification panel |
| `--z-chat-widget` | 40 | Kura — under modals, over everything else |
| `--z-modal-overlay` | 50 | login modal, crop modal, mobile nav drawer |
| `--z-toast` | 60 | confirmations, visible even over a modal |

Each has a matching `@utility` (`z-header`, `z-dropdown`, …) so components say what a
thing *is*, not where it happened to land. Gaps of ten leave room to slot a layer in
without renumbering.

This exists because the same class of bug turned up three times, most recently the hero
card deck painting over the navbar. The cause was not a wrong number — it was two
unrelated components both picking `z-40` and the tie being broken by document order.
Named layers make that collision impossible to write by accident, and `grep -rn 'z-[0-9]'
src` finds any regression.

**Anything that only stacks against its own children stays off the scale.** Isolate it
instead — `isolation: isolate`, i.e. Tailwind's `isolate` — so its internal ordering is
sealed inside its own stacking context. `HeroCollage` does this: the deck's four cards are
ordered 1–4 against each other and, because the collage is isolated, no descendant of it
can outrank anything outside it whatever number it carries. Small local numbers also read
as obviously local, where the old `z-40` read as global and behaved like it.

### The mark

`Pennant` in `src/components/brand.tsx` is drawn for 32px first, because that is the size it is
used at in the header. Four things keep it legible there:

- **The blue border is a stroke on a shape drawn under an unstroked crimson fill**, so the entire
  border sits outside the outline. Stroking one path put half the border *inside* it, eating the
  crimson field and rounding the pennant tips from the inside out.
- **The notch between the pennants is a real concave vertex** — the upper pennant's lower edge
  rises to its tip rather than running flat — so the two pennants read as two.
- **The sun is one filled path**: a solid disc plus eight chunky triangular rays whose valleys
  sit exactly on the disc. It used to be a disc plus eight hairline strokes, which smeared into a
  halo at anything under 48px.
- **`--flag-crimson`, `--flag-blue` and `--flag-white` are fixed in both themes** and are
  deliberately not redefined in the dark block. The emblems were painted in `--color-snow`, which
  is off-white in light and `#1e1d22` in dark — so in dark mode the white moon and sun came out
  near-black on red. A national flag does not restyle.

`showEmblems={false}` drops to the silhouette, for the few places it appears smaller than 20px.

---

## Known placeholders

- **Hero copy** lives in the `HERO` object at the top of `src/app/page.tsx` and is expected to
  keep changing. The Devanagari badge line still wants a native speaker's read before launch;
  alternates for it and for the headline are in the comment above the object.
- **Hero cards** are in `HERO_CARDS` in `src/components/hero-cards.tsx` — invented examples of
  the kinds of thing the feed carries, not real posts.
- **People search is a filter, not a search.** `findPeople()` matches names against the fixture
  directory in the browser; there is no search backend and it is not pretending there is one.
  Only Bishal has a written-up profile; everyone else's page shows what a post byline already
  knows about them, and the sections they have nothing for do not render.
- **Pasting an image into the composer does nothing but say so.** Attachments need somewhere to
  put the file — Supabase Storage — which is a backend pass. Text paste is untouched.
- **Everything you write lasts as long as the tab.** A post, an edit, a job added in settings —
  all of it goes into the module-level store in `src/lib/api/`, so it is consistent across the
  feed, your profile and settings within a session, and gone on reload.
- **Editing and deleting a post is client-side.** The author gets both for fifteen minutes after
  posting, checked in the browser against the post's timestamp. That is a mock-phase shortcut:
  the real check is one comparison in an RLS policy once posts carry a server timestamp. The
  seeded posts have no timestamp at all, so their window is correctly already closed.
- **Sharing copies a link to a page that does not resolve to the post.** `navigator.share` where
  there is one, the clipboard everywhere else. The URL is `/feed#<id>`; post permalinks are a
  real route away.
- **Comment threads are mocked.** Only the Cedar Gate question has a thread
  (`MOCK_COMMENTS` in `src/lib/feed-mock.ts`); the other posts expand to an empty
  state. Replies are component state and vanish on reload. The comment counts on the
  cards are the original mock numbers and do not match the thread lengths.
- **"Mark as answer" is author-only**, so it is invisible while the mock login signs
  you in as Bishal T. and the only question belongs to Aashish K. Point `MOCK_USER`
  at `AASHISH` to see it.
- **The theme persists; the mock login does not.** The chosen theme is kept in `localStorage`
  and re-applied by a small script in `<head>` before first paint, so there is no flash. A
  reload still signs you out, because the mock session is React state and nothing else.
- **Logging in is mocked.** `src/components/mock-auth.tsx` is a React context holding a single
  hardcoded user (Bishal T., from the feed's mock data). The header's "Log in" opens a modal
  rather than routing, and either control in it signs you in as that person. No Supabase, no
  cookie, no localStorage — a reload signs you out, which is expected for this pass. Real auth
  still exists alongside it and `/login` is untouched. See [Who is signed in](#who-is-signed-in)
  for how the two are reconciled; everything calling `useMockAuth()` is the list of places to
  change when they are properly joined up.
- **Profile and cover pictures are not uploaded anywhere.** Cropping produces a canvas, and the
  canvas becomes an object URL, so it lasts as long as the tab. The `avatars` bucket and its
  policies exist; the write does not. `saveProfileImage()` in `src/lib/api/` is the one function
  that becomes an upload.
- **Sathi connections are session state.** `MOCK_SATHI_EDGES` seeds them — Bishal is Sathis with
  Aashish and Nisha, Suman has a request pending — and accepting or sending one lasts as long as
  the tab. Everything derived from them (counts, the feed filter, Kura's two lists) is real and
  live; only the persistence is missing.
- **Kura delivers nothing.** The two conversations are fixtures written from Bishal's side, and
  sending appends to a session store and reaches nobody — there is no second browser for it to
  arrive in. This is the one feature genuinely waiting on Realtime rather than on a plain query:
  `getConversations()` becomes a select plus a subscription and `sendMessage()` becomes an
  insert, and the widget itself does not change.
- **The niche badge always says Tech**, because tech is the only niche open. Seeded posts carry
  no niche at all and fall back to `DEFAULT_NICHE`; the composer states the niche rather than
  asking, since a picker with one option is not a picker. `MockPost.niche` becomes a required
  column, and that label becomes the picker, the day a second niche exists.
- **The whole of `/feed`.** Posts, authors, the leaderboard, the online count and the niche list
  all come from `src/lib/feed-mock.ts`. Reactions are React state and are lost on reload. Still
  to build behind it: a `post_type` enum on `posts`, a `weight` column on `reactions`, a real
  leaderboard query, and Supabase Realtime presence.
- **The category filter does not filter yet.** `MockPost` carries no niche, and every mock post
  is a tech post, so picking Tech drives the nav state and the URL but cannot thin the list. It
  starts working the day posts know which niche they belong to.
- **The dhog weighting** in `src/lib/dhog.ts` is deliberately asymmetric — a "not helpful" is
  worth a fraction of a dhog, and the formula is never rendered. Move the constants to the
  `reactions.weight` column so they can be tuned without a deploy.
- **The notification bell** opens a panel of three hardcoded lines written for the signed-in
  user. Nothing generates them, opening the panel marks them read for as long as the tab is
  open, and nothing is stored. It renders for anyone signed in — real session or mock — and for
  nobody else, since there is nothing to notify a visitor about.
- **`onboarding_responses.first_action_kind` / `first_action_text` are now always null.** Step 3
  used to ask for a first post and those columns held it; it offers the profile sections
  instead. The columns stay for the accounts that did answer, and `posts` still requires a
  `space_id` that a new account does not have, so there was nowhere to publish it anyway.
- **Nothing renders a recognition tier.** The tier system is still in
  `src/lib/dhog.ts` and still correct, but no component reads it: a badge saying
  `TIER_3` next to somebody's name does not look unfinished, it looks broken. Wire it
  back up once the names below exist.
- **The recognition tier names.** `RECOGNITION_TIERS` in `src/lib/dhog.ts` ships as
  `TIER_1`…`TIER_5` and must not launch that way. The thresholds and the lookup are real; only
  the names are stand-ins, and the Nepali naming is a separate decision that wants a native
  speaker. Nothing else has to change when they are replaced.
- **Sample posts** in `src/components/sample-posts.tsx` render only when the database has no real
  posts, and are labelled "Example" wherever they appear.
- **Avatar uploads.** The `avatars` storage bucket and its policies exist; the profile builder has
  no upload control yet. Avatars currently come from Google OAuth or fall back to initials.
- **`hello@sathi.example`** on `/pending` is not a real address.

## Deliberately not built

Noted for later, and left out on purpose:

- **Downvotes, ever.** There is no anti-dhog and no negative weight anywhere in the schema.
- Wiring the feed to the live dhog views — the model and schema are built, and the feed's reads
  and writes already go through `src/lib/api`; only the Supabase branch of those functions is
  still to write
- Materialised or cached dhog totals; the views are computed on read until traffic says otherwise
- Automated awards for hosting a session — an admin calls `award_dhog()` by hand
- Real presence tracking behind the active-user count
- A notification system behind the bell icon
- A tag taxonomy beyond the fixed content-type filter
- Native video or seminar hosting
- Paid or live AMA features
- Payment processing of any kind
- Any verification method other than LinkedIn URL + manual review

---

## Deploying to Vercel

1. Import the repo.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL`
   (your production domain).
3. In Supabase → Authentication → URL Configuration, set the site URL and add
   `https://<your-domain>/auth/callback` as a redirect URL.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run db:reset   # supabase db reset (local, re-runs migrations + seed)
npm run db:push    # supabase db push (hosted)
```
