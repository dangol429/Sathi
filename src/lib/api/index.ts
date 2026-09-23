/* ===========================================================================
 * The data-access layer.
 *
 * Every read and write the app performs goes through a function in here. No
 * component imports the mock arrays any more, so switching a feature from mock
 * data to Supabase is editing one function body rather than hunting through
 * the tree for the places that reached into feed-mock directly.
 *
 * Each function has the same shape:
 *
 *   if (USE_MOCK_DATA) return mockDelay(<something from feed-mock>);
 *   return notWired("name");   // ← the Supabase call goes here
 *
 * The mock branch is deliberately async and slightly slow, so callers are
 * written against a promise from the start and nothing quietly assumes the
 * data is already in memory.
 *
 * The profile-detail readers (education, work experience, projects,
 * certifications) return an EMPTY array for anybody who has not filled that
 * section in — no invented rows. That emptiness is a real signal: it is what
 * the "fill your details" prompt on your own profile keys off.
 * ========================================================================= */

import { USE_MOCK_DATA } from "@/lib/config";
import { mockDelay, notWired } from "@/lib/api/latency";
import {
  findPerson,
  MOCK_USER,
  MOCK_ACTIVE_NOW,
  MOCK_CONVERSATIONS,
  MOCK_LEADERBOARD,
  MOCK_NICHES,
  MOCK_NOTIFICATIONS,
  MOCK_PEOPLE,
  MOCK_POSTS,
  MOCK_REPOSTS,
  MOCK_SATHI_EDGES,
  MOCK_SATHI_REQUESTS_IN,
  commentsFor,
  findMockNiche,
  searchPeople,
  type MockComment,
  type MockConversation,
  type MockLeader,
  type MockMessage,
  type MockNiche,
  type MockNotification,
  type MockPerson,
  type MockPost,
  type MockRepost,
  type MockUser,
  type ProfileEntry,
} from "@/lib/feed-mock";
import {
  FOUNDING_COHORT_SIZE,
  MOCK_ACCOUNTS,
  MOCK_APPLICATIONS,
  type MockAccount,
  type MockApplication,
} from "@/lib/moderation";
import type { RepostEntry } from "@/lib/repost";

/* ---------------------------------------------------------------------------
 * Session-lifetime store.
 *
 * The mock branch has to remember edits within a tab — a post you wrote, a
 * détail you added — or every write would appear to succeed and then vanish.
 * It is a plain module-level object on purpose: it dies with the tab, exactly
 * like the rest of this phase.
 * ------------------------------------------------------------------------- */
type DetailKind = "education" | "experience" | "projects" | "certifications";

const store = {
  posts: [...MOCK_POSTS] as MockPost[],
  /** Threads, deep-copied so sending a message does not edit the fixture. */
  conversations: MOCK_CONVERSATIONS.map((c) => ({
    ...c,
    messages: [...c.messages],
  })) as MockConversation[],
  /* Connections, as normalised "a|b" pairs so a lookup cannot depend on which
     way round the two slugs were written. */
  sathiEdges: new Set(MOCK_SATHI_EDGES.map(([a, b]) => pairKey(a, b))),
  /** Requests waiting on the signed-in user, and ones they have sent. */
  sathiIn: new Set(MOCK_SATHI_REQUESTS_IN),
  sathiOut: new Set<string>(),
  /** Detail rows added at runtime, by profile id then section. */
  details: new Map<string, Partial<Record<DetailKind, ProfileEntry[]>>>(),
  deleted: new Set<string>(),
  /** Reposts, seeded and then added to as the viewer passes things on. */
  reposts: [...MOCK_REPOSTS] as MockRepost[],
  /* Moderation state. Copied per row rather than shallow-copied as a list,
     because approving edits a row in place and must not reach the fixture —
     a queue that stayed approved after a reload would be lying about what the
     database holds. */
  applications: MOCK_APPLICATIONS.map((a) => ({ ...a })) as MockApplication[],
  accounts: MOCK_ACCOUNTS.map((a) => ({ ...a })) as MockAccount[],
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/* ---------------------------------------------------------------------------
 * Sathi connections.
 *
 * One relationship, mutual by construction: the store holds undirected pairs,
 * so there is no way to be somebody's Sathi without them being yours. Every
 * count and every filter in the app is derived from these — nothing caches a
 * number that could fall out of step.
 *
 * The subscription exists because a single accept has to move several things
 * at once: the button on a profile, which list a Kura thread sits in, the
 * feed's Sathis filter, and two profile counts. Rather than have each of them
 * poll, a write notifies and they re-read. That is the shape a Realtime
 * subscription will take anyway, so the components are already written for it.
 * ------------------------------------------------------------------------- */

/** Who the connection functions answer as. One identity, in this phase. */
const VIEWER = MOCK_USER.slug;

const sathiListeners = new Set<() => void>();

/** Called after every connection write. Returns an unsubscribe. */
export function subscribeSathis(listener: () => void): () => void {
  sathiListeners.add(listener);
  return () => sathiListeners.delete(listener);
}

function notifySathis() {
  for (const listener of sathiListeners) listener();
}

function partnersOf(slug: string): string[] {
  const out: string[] = [];
  for (const key of store.sathiEdges) {
    const [a, b] = key.split("|");
    if (a === slug) out.push(b);
    else if (b === slug) out.push(a);
  }
  return out;
}

export type SathiState = {
  /** Slugs the signed-in user is connected to. */
  sathiIds: string[];
  /** Requests waiting on them to answer. */
  incoming: string[];
  /** Requests they have sent and are waiting on. */
  outgoing: string[];
};

/**
 * The signed-in user's whole connection picture, in one read.
 *
 * One call rather than three because every caller wants at least two of them,
 * and three separate round trips would give three separate moments at which
 * the UI is half-updated.
 */
export async function getSathiState(): Promise<SathiState> {
  if (USE_MOCK_DATA) {
    return mockDelay({
      sathiIds: partnersOf(VIEWER),
      incoming: [...store.sathiIn],
      outgoing: [...store.sathiOut],
    });
  }
  return notWired("getSathiState");
}

/** How many Sathis somebody has — anybody, not just the signed-in user. */
export async function getSathiCount(profileId: string): Promise<number> {
  if (USE_MOCK_DATA) return mockDelay(partnersOf(profileId).length, 120);
  return notWired("getSathiCount");
}

/** The people the signed-in user is connected to, for the feed's filter. */
export async function getSathis(): Promise<MockPerson[]> {
  if (USE_MOCK_DATA) {
    const ids = new Set(partnersOf(VIEWER));
    return mockDelay(MOCK_PEOPLE.filter((person) => ids.has(person.slug)));
  }
  return notWired("getSathis");
}

export async function sendSathiRequest(profileId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    // Asking somebody who has already asked you is just an accept.
    if (store.sathiIn.has(profileId)) return acceptSathiRequest(profileId);
    store.sathiOut.add(profileId);
    notifySathis();
    await mockDelay(null, 140);
    return;
  }
  return notWired("sendSathiRequest");
}

export async function acceptSathiRequest(profileId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    store.sathiIn.delete(profileId);
    store.sathiOut.delete(profileId);
    store.sathiEdges.add(pairKey(VIEWER, profileId));
    notifySathis();
    await mockDelay(null, 140);
    return;
  }
  return notWired("acceptSathiRequest");
}

export async function declineSathiRequest(profileId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    store.sathiIn.delete(profileId);
    notifySathis();
    await mockDelay(null, 140);
    return;
  }
  return notWired("declineSathiRequest");
}

/* --- Feed ---------------------------------------------------------------- */

export async function getFeedPosts(): Promise<MockPost[]> {
  if (USE_MOCK_DATA) {
    return mockDelay(store.posts.filter((post) => !store.deleted.has(post.id)));
  }
  return notWired("getFeedPosts");
}

export async function getPostsByAuthor(name: string): Promise<MockPost[]> {
  if (USE_MOCK_DATA) {
    const posts = store.posts.filter(
      (post) => post.author.name === name && !store.deleted.has(post.id),
    );
    return mockDelay(posts);
  }
  return notWired("getPostsByAuthor");
}

export async function createPost(post: MockPost): Promise<MockPost> {
  if (USE_MOCK_DATA) {
    store.posts = [post, ...store.posts];
    return mockDelay(post, 120);
  }
  return notWired("createPost");
}

export async function editPost(id: string, content: string): Promise<MockPost | null> {
  if (USE_MOCK_DATA) {
    let edited: MockPost | null = null;
    store.posts = store.posts.map((post) => {
      if (post.id !== id) return post;
      edited = { ...post, content, editedAt: "just now" };
      return edited;
    });
    return mockDelay(edited, 120);
  }
  return notWired("editPost");
}

export async function deletePost(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    store.deleted.add(id);
    store.posts = store.posts.filter((post) => post.id !== id);
    await mockDelay(null, 120);
    return;
  }
  return notWired("deletePost");
}

/* --- Comments ------------------------------------------------------------ */

export async function getComments(postId: string): Promise<MockComment[]> {
  if (USE_MOCK_DATA) return mockDelay(commentsFor(postId));
  return notWired("getComments");
}

/* --- Dhog ---------------------------------------------------------------- */

/**
 * Giving and taking back are two functions rather than one toggle, because
 * that is how they will land on the server: an insert and a delete against
 * public.reactions. The weighting itself is decided in the database and is not
 * this layer's business.
 */
export async function giveDhog(targetId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    // Nowhere to write it: the card holds "you gave this" in its own state for
    // as long as the tab is open. The id is in the signature because the real
    // branch inserts a row keyed by it, and adding the parameter later would
    // mean touching every caller.
    void targetId;
    await mockDelay(null, 90);
    return;
  }
  return notWired("giveDhog");
}

export async function removeDhog(targetId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    void targetId;
    await mockDelay(null, 90);
    return;
  }
  return notWired("removeDhog");
}

/* --- Reposts ---------------------------------------------------------------
 *
 * Unlike dhog, a repost is not just a number: it puts a card in somebody's
 * feed and on their profile, so it has to be stored rather than held
 * optimistically in the pressing component. That is why these read back — the
 * button's pressed state comes from the store, not from a local guess, so
 * undoing still works after a refetch and the banner appears and disappears
 * with it.
 *
 * Entries come back with the post already resolved. Doing the join here rather
 * than in two components is the point of this layer, and it becomes a single
 * select with an embedded post the day it is real.
 * ------------------------------------------------------------------------- */

function resolveReposts(reposts: MockRepost[]): RepostEntry[] {
  const entries: RepostEntry[] = [];
  for (const repost of reposts) {
    const post = store.posts.find((candidate) => candidate.id === repost.postId);
    // A repost of a deleted post is not a card with a hole in it, it is gone.
    if (!post || store.deleted.has(post.id)) continue;
    entries.push({ repost, post });
  }
  return entries;
}

export async function getReposts(): Promise<RepostEntry[]> {
  if (USE_MOCK_DATA) return mockDelay(resolveReposts(store.reposts));
  return notWired("getReposts");
}

/** Everything one person has passed on, for their profile timeline. */
export async function getRepostsBy(profileId: string): Promise<RepostEntry[]> {
  if (USE_MOCK_DATA) {
    return mockDelay(resolveReposts(store.reposts.filter((r) => r.bySlug === profileId)));
  }
  return notWired("getRepostsBy");
}

export async function repost(postId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const already = store.reposts.some((r) => r.postId === postId && r.bySlug === MOCK_USER.slug);
    if (!already) {
      store.reposts = [
        {
          id: `repost-local-${Date.now()}`,
          postId,
          by: MOCK_USER,
          bySlug: MOCK_USER.slug,
          postedAt: "just now",
        },
        ...store.reposts,
      ];
    }
    await mockDelay(null, 90);
    return;
  }
  return notWired("repost");
}

export async function unrepost(postId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    store.reposts = store.reposts.filter(
      (r) => !(r.postId === postId && r.bySlug === MOCK_USER.slug),
    );
    await mockDelay(null, 90);
    return;
  }
  return notWired("unrepost");
}

/* --- People and profiles -------------------------------------------------- */

export async function getPeople(): Promise<MockPerson[]> {
  if (USE_MOCK_DATA) return mockDelay(MOCK_PEOPLE);
  return notWired("getPeople");
}

/**
 * Whoever is signed in.
 *
 * Mock auth calls this rather than reaching for the fixture itself, so the day
 * this becomes supabase.auth.getUser() there is one function to change and no
 * component to touch.
 */
export async function getCurrentUser(): Promise<MockUser> {
  if (USE_MOCK_DATA) return mockDelay(MOCK_USER, 220);
  return notWired("getCurrentUser");
}

/* ---------------------------------------------------------------------------
 * The people directory, fetched once.
 *
 * Every name and every avatar in a feed needs to know whether that person has
 * a page, and asking separately for each one would be dozens of identical
 * reads. One promise, shared: the real version is the same query behind a
 * cache. cachedDirectory() lets a component start from what has already
 * arrived rather than flashing plain text on every remount.
 * ------------------------------------------------------------------------- */
let directory: MockPerson[] | null = null;
let directoryLoad: Promise<MockPerson[]> | null = null;

export function cachedDirectory(): MockPerson[] {
  return directory ?? [];
}

export function getDirectory(): Promise<MockPerson[]> {
  directoryLoad ??= getPeople().then((people) => {
    directory = people;
    return people;
  });
  return directoryLoad;
}

export async function getProfile(id: string): Promise<MockPerson | null> {
  if (USE_MOCK_DATA) return mockDelay(findPerson(id));
  return notWired("getProfile");
}

export async function findPeople(query: string): Promise<MockPerson[]> {
  if (USE_MOCK_DATA) return mockDelay(searchPeople(query), 90);
  return notWired("findPeople");
}

export async function updateProfile(
  id: string,
  patch: Partial<
    Pick<
      MockPerson,
      "name" | "tagline" | "role" | "city" | "linkedinUrl" | "avatarUrl" | "coverUrl"
    >
  >,
): Promise<void> {
  if (USE_MOCK_DATA) {
    const person = findPerson(id);
    if (person) Object.assign(person, patch);
    await mockDelay(null, 140);
    return;
  }
  return notWired("updateProfile");
}

/**
 * A profile picture or cover image.
 *
 * Separate from updateProfile because it is a different operation once there
 * is a backend: this becomes an upload to a Storage bucket followed by a write
 * of the returned public URL. Today the "upload" already happened in the
 * browser — the caller hands over an object URL over a file it is holding — so
 * all that is left is the write.
 */
export async function saveProfileImage(
  id: string,
  kind: "avatar" | "cover",
  url: string | null,
): Promise<void> {
  if (USE_MOCK_DATA) {
    const person = findPerson(id);
    if (person) {
      if (kind === "avatar") person.avatarUrl = url ?? undefined;
      else person.coverUrl = url ?? undefined;
    }
    await mockDelay(null, 140);
    return;
  }
  return notWired("saveProfileImage");
}

/* --- Profile detail -------------------------------------------------------
 *
 * Empty is a real answer. Nobody but Bishal has filled these in, and inventing
 * rows for the rest would hide exactly the state the UI needs to detect.
 * ------------------------------------------------------------------------- */

function readDetail(profileId: string, kind: DetailKind): ProfileEntry[] {
  const added = store.details.get(profileId)?.[kind];
  if (added) return added;

  const details = findPerson(profileId)?.details;
  if (!details) return [];

  return kind === "education"
    ? details.education
    : kind === "experience"
      ? details.experience
      : kind === "projects"
        ? details.projects
        : details.certifications;
}

async function writeDetail(profileId: string, kind: DetailKind, rows: ProfileEntry[]) {
  const current = store.details.get(profileId) ?? {};
  store.details.set(profileId, { ...current, [kind]: rows });
  await mockDelay(null, 140);
}

export async function getEducation(profileId: string): Promise<ProfileEntry[]> {
  if (USE_MOCK_DATA) return mockDelay(readDetail(profileId, "education"));
  return notWired("getEducation");
}

export async function getWorkExperience(profileId: string): Promise<ProfileEntry[]> {
  if (USE_MOCK_DATA) return mockDelay(readDetail(profileId, "experience"));
  return notWired("getWorkExperience");
}

export async function getProjects(profileId: string): Promise<ProfileEntry[]> {
  if (USE_MOCK_DATA) return mockDelay(readDetail(profileId, "projects"));
  return notWired("getProjects");
}

export async function getCertifications(profileId: string): Promise<ProfileEntry[]> {
  if (USE_MOCK_DATA) return mockDelay(readDetail(profileId, "certifications"));
  return notWired("getCertifications");
}

export async function saveEducation(profileId: string, rows: ProfileEntry[]) {
  if (USE_MOCK_DATA) return writeDetail(profileId, "education", rows);
  return notWired("saveEducation");
}

export async function saveWorkExperience(profileId: string, rows: ProfileEntry[]) {
  if (USE_MOCK_DATA) return writeDetail(profileId, "experience", rows);
  return notWired("saveWorkExperience");
}

export async function saveProjects(profileId: string, rows: ProfileEntry[]) {
  if (USE_MOCK_DATA) return writeDetail(profileId, "projects", rows);
  return notWired("saveProjects");
}

export async function saveCertifications(profileId: string, rows: ProfileEntry[]) {
  if (USE_MOCK_DATA) return writeDetail(profileId, "certifications", rows);
  return notWired("saveCertifications");
}

/* --- Kura (messages) -------------------------------------------------------
 *
 * The one part of the app that is genuinely waiting on Realtime rather than on
 * a plain query: a thread has to arrive without being asked for. These three
 * functions are the seam — getConversations becomes a select plus a
 * subscription, sendMessage becomes an insert, and nothing in the widget
 * changes.
 * ------------------------------------------------------------------------- */

export async function getConversations(): Promise<MockConversation[]> {
  if (USE_MOCK_DATA) return mockDelay(store.conversations);
  return notWired("getConversations");
}

/**
 * Appends to the thread and hands the message back.
 *
 * Local only, as everything in this phase is: there is no second browser for
 * it to arrive in. It returns the created message rather than void because the
 * real insert will come back with a server id and timestamp the caller needs.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<MockMessage | null> {
  if (USE_MOCK_DATA) {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (!conversation) return mockDelay(null, 90);

    const message: MockMessage = {
      id: `${conversationId}-${Date.now()}`,
      fromMe: true,
      content,
      postedAt: "just now",
      createdAt: Date.now(),
    };
    conversation.messages = [...conversation.messages, message];
    return mockDelay(message, 90);
  }
  return notWired("sendMessage");
}

/** Opening a thread is what marks it read. Nothing else does. */
export async function markConversationRead(conversationId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (conversation) conversation.unread = false;
    await mockDelay(null, 60);
    return;
  }
  return notWired("markConversationRead");
}

/**
 * Changes a message you sent, within its window.
 *
 * The window itself is not re-checked here — the client already hid the
 * control once it closed, and the real enforcement is an RLS policy, not this
 * function. This only has to agree with the client about which message it is.
 */
export async function editMessage(
  conversationId: string,
  messageId: string,
  content: string,
): Promise<void> {
  if (USE_MOCK_DATA) {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (conversation) {
      conversation.messages = conversation.messages.map((message) =>
        message.id === messageId ? { ...message, content, editedAt: true } : message,
      );
    }
    await mockDelay(null, 90);
    return;
  }
  return notWired("editMessage");
}

/**
 * Removes a message you sent, entirely — matching how deleting a post works
 * rather than leaving a "this message was deleted" placeholder behind. Once
 * gone, whatever was last in the thread becomes the new preview in the
 * conversation list on its own, since that preview always reads the last
 * remaining message rather than a stored pointer.
 */
export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (conversation) {
      conversation.messages = conversation.messages.filter((message) => message.id !== messageId);
    }
    await mockDelay(null, 90);
    return;
  }
  return notWired("deleteMessage");
}

/* --- Notifications --------------------------------------------------------- */

export async function getNotifications(): Promise<MockNotification[]> {
  if (USE_MOCK_DATA) return mockDelay(MOCK_NOTIFICATIONS);
  return notWired("getNotifications");
}

/* --- Right rail ------------------------------------------------------------ */

export async function getLeaderboard(): Promise<MockLeader[]> {
  if (USE_MOCK_DATA) return mockDelay(MOCK_LEADERBOARD);
  return notWired("getLeaderboard");
}

/**
 * The live count. A Supabase Realtime presence channel replaces this — hence
 * the promise, even though the mock answer is a constant.
 */
export async function getActiveNow(): Promise<number> {
  if (USE_MOCK_DATA) return mockDelay(MOCK_ACTIVE_NOW, 90);
  return notWired("getActiveNow");
}

/* --- Niches ---------------------------------------------------------------- */

export async function getNiches(): Promise<MockNiche[]> {
  if (USE_MOCK_DATA) return mockDelay(MOCK_NICHES, 90);
  return notWired("getNiches");
}

/**
 * One niche by slug, or null for a slug that does not exist — which the feed
 * route treats as a broken link rather than as an empty feed.
 */
export async function getNiche(slug: string | undefined): Promise<MockNiche | null> {
  if (USE_MOCK_DATA) return mockDelay(findMockNiche(slug), 60);
  return notWired("getNiche");
}

/* --- Moderation ------------------------------------------------------------
 *
 * Read by the /darbar console and by nothing else. These go through this file
 * like every other read and write, so the console switches to real data on the
 * same day the rest of the app does rather than needing its own migration.
 *
 * The real implementations are already written, in SQL: approve_professional
 * and reject_professional are SECURITY DEFINER functions that re-check
 * is_admin() in the database. So the notWired() branches below become one rpc
 * call each — see app/actions/admin.ts, which already makes exactly those two
 * calls for the Supabase-backed review page.
 * ------------------------------------------------------------------------- */

export async function getApplications(): Promise<MockApplication[]> {
  if (USE_MOCK_DATA) return mockDelay([...store.applications]);
  return notWired("getApplications");
}

export async function getAccounts(): Promise<MockAccount[]> {
  if (USE_MOCK_DATA) return mockDelay([...store.accounts]);
  return notWired("getAccounts");
}

/**
 * Approving does three things at once, and they have to stay together: the
 * application is marked verified, the person's account becomes a professional,
 * and — while founding slots remain — they are marked a founding member. The
 * SQL function does all three in one transaction for the same reason.
 */
export async function approveApplication(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const application = store.applications.find((a) => a.id === id);
    if (application) {
      const verified = store.applications.filter((a) => a.status === "verified").length;
      application.status = "verified";
      application.reviewedAt = new Date().toISOString();
      application.foundingMember = verified < FOUNDING_COHORT_SIZE;
      application.reviewNote = undefined;

      const account = store.accounts.find((a) => a.email === application.email);
      if (account) {
        account.role = "professional";
        account.review = "verified";
      }
    }
    await mockDelay(null, 140);
    return;
  }
  return notWired("approveApplication");
}

/**
 * The note is not optional in spirit: a rejection with no reason is shown to
 * the person on /pending as a blank, which is worse than a plain no. The UI
 * requires one; this keeps whatever it is given.
 */
export async function rejectApplication(id: string, note: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const application = store.applications.find((a) => a.id === id);
    if (application) {
      application.status = "rejected";
      application.reviewedAt = new Date().toISOString();
      application.reviewNote = note.trim() || undefined;
      application.foundingMember = false;

      const account = store.accounts.find((a) => a.email === application.email);
      if (account) account.review = "rejected";
    }
    await mockDelay(null, 140);
    return;
  }
  return notWired("rejectApplication");
}

/**
 * Suspending is reversible and deliberately does not delete anything: the
 * account stays, their posts stay, and the only change is that they cannot
 * sign in. Removing someone's writing is a separate decision, made per post.
 */
export async function setAccountSuspended(id: string, suspended: boolean): Promise<void> {
  if (USE_MOCK_DATA) {
    const account = store.accounts.find((a) => a.id === id);
    if (account) account.suspended = suspended;
    await mockDelay(null, 120);
    return;
  }
  return notWired("setAccountSuspended");
}
