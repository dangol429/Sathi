import type { RealPostType } from "@/lib/feed";

/* ===========================================================================
 * MOCK DATA — UI PASS ONLY.
 *
 * Nothing in this file touches Supabase. /feed and /profile render entirely
 * from here so the layout, the filter, the comment thread and the dhog
 * interaction can be judged before any of it is wired to real data.
 *
 * These are not real people. When the real queries land, delete this file and
 * the imports will tell you every place that has to change.
 * ========================================================================= */

export type MockAuthor = {
  name: string;
  role: string;
  city: string;
  verified: boolean;
  /** Lifetime dhog — the credential the recognition tier is read from. */
  lifetimeDhog: number;
};

/* One definition per person, used by posts, comments and the profile alike,
   so nobody's role or dhog total can drift between two screens. */
const AASHISH: MockAuthor = {
  name: "Aashish K.",
  role: "Software Engineer",
  city: "Kathmandu",
  verified: true,
  lifetimeDhog: 640,
};

const PRIYA: MockAuthor = {
  name: "Priya S.",
  role: "Product Designer",
  city: "Pokhara",
  verified: true,
  lifetimeDhog: 3120,
};

const BISHAL: MockAuthor = {
  name: "Bishal T.",
  role: "Engineering Lead",
  city: "Lalitpur",
  verified: true,
  lifetimeDhog: 5400,
};

const NISHA: MockAuthor = {
  name: "Nisha R.",
  role: "Backend Engineer",
  city: "Kathmandu",
  verified: true,
  lifetimeDhog: 2180,
};

/** On the leaderboard from the start, and now with a page like everyone else. */
const SUMAN: MockAuthor = {
  name: "Suman G.",
  role: "Data Analyst",
  city: "Biratnagar",
  verified: true,
  lifetimeDhog: 512,
};

/* --- Comments ------------------------------------------------------------ */

export type MockComment = {
  id: string;
  author: MockAuthor;
  content: string;
  postedAt: string;
  /** The same reaction a post carries. There is no negative counterpart. */
  dhog: number;
  /** Nested, Reddit-style. Only top-level comments can be marked as answers. */
  replies: MockComment[];
};

export type MockPost = {
  id: string;
  type: RealPostType;
  /**
   * The niche slug this was posted in. Optional because every seeded post
   * predates the field and every one of them is tech — DEFAULT_NICHE fills the
   * gap. It becomes required, and a real column, the day a second niche opens.
   */
  niche?: string;
  author: MockAuthor;
  /** Pre-baked relative time — no clock maths, so the render is stable. */
  postedAt: string;
  content: string;
  /**
   * What the recipient has been given. There is no counterpart field: no
   * reaction in this product carries a negative weight, so this only ever
   * goes up.
   */
  dhog: number;
  /** The count shown on the card. */
  comments: number;
  /**
   * How many times this has been reposted, before counting your own.
   *
   * A baseline like `dhog` and `comments`, for the same reason: the fixtures
   * describe a feed that has already been running, and seeding one repost
   * record per historical repost would be inventing five people to make one
   * number. The individual records in MOCK_REPOSTS are the ones that have to
   * render a banner somewhere; this is only the total under the card.
   */
  reposts?: number;
  /**
   * Epoch milliseconds, set when a post is written in this session. The
   * seeded posts deliberately have none: they are hours or days old, so the
   * edit window is long closed and the actions correctly never appear.
   */
  createdAt?: number;
  /** Set when the author edits within the window. */
  editedAt?: string;
  /**
   * An attached image. In this pass it is only ever an object URL made in the
   * composer, so it lives as long as the tab does and no longer — there is
   * nowhere to upload it to until Supabase Storage is wired up.
   */
  imageUrl?: string;
};

export const MOCK_POSTS: MockPost[] = [
  {
    id: "mock-1",
    type: "question",
    author: AASHISH,
    postedAt: "2h ago",
    content:
      "Anyone know what stack Cedar Gate is actually using right now? Interviewing there next week and want to sound like I've done my homework.",
    dhog: 34,
    comments: 12,
    reposts: 6,
  },
  {
    id: "mock-2",
    type: "opportunity",
    author: PRIYA,
    postedAt: "5h ago",
    content:
      "Running a free 30-min counselling session this Saturday for anyone confused about frontend vs backend. Comment if you want a slot.",
    dhog: 58,
    comments: 21,
    reposts: 11,
  },
  {
    id: "mock-3",
    type: "career-story",
    author: BISHAL,
    postedAt: "Yesterday",
    content:
      "Started as a QA tester in 2016, no CS degree. Six years later I'm leading the platform team. Ask me anything about the jump.",
    dhog: 112,
    comments: 34,
    reposts: 23,
  },
  {
    id: "mock-5",
    type: "opportunity",
    author: BISHAL,
    postedAt: "3d ago",
    content:
      "Cedar Gate's platform team is hiring two mid-level engineers. Comment if you want the referral, I'll take a look at your GitHub.",
    dhog: 94,
    comments: 27,
    reposts: 14,
  },
  {
    id: "mock-6",
    type: "career-story",
    author: BISHAL,
    postedAt: "5d ago",
    content:
      "Promoted three QA folks into engineering roles this year. If you're technical-adjacent and think you can't make the jump — you're wrong.",
    dhog: 143,
    comments: 19,
    reposts: 9,
  },
  {
    id: "mock-4",
    type: "discussion",
    author: NISHA,
    postedAt: "2d ago",
    content:
      "Hot take: Nepali companies underpay engineers who could easily get remote US salaries. Change my mind.",
    dhog: 76,
    comments: 48,
    reposts: 17,
  },
];

/* --- Reposts --------------------------------------------------------------
 *
 * A repost is a pointer, never a copy. It carries no content of its own: it
 * says "this person passed that post on", and the card underneath is still the
 * original author's, with the original author's dhog and the original author's
 * comment thread. Copying the content would fork it — two cards drifting apart
 * the moment the author edits one of them.
 *
 * Only the two below are written out, both by people other than the signed-in
 * user, so a repost is visible in the feed and on a profile without anybody
 * having to press the button first. Everything the viewer reposts is added to
 * this list at runtime and lasts as long as the tab.
 * ------------------------------------------------------------------------- */

export type MockRepost = {
  id: string;
  /** The post being passed on. Resolved against MOCK_POSTS when it renders. */
  postId: string;
  /** Who passed it on. */
  by: MockAuthor;
  /** Their profile, so the banner can link to them. */
  bySlug: string;
  postedAt: string;
};

export const MOCK_REPOSTS: MockRepost[] = [
  {
    id: "repost-nisha-1",
    postId: "mock-3",
    by: NISHA,
    bySlug: "nisha-r",
    postedAt: "1h ago",
  },
  {
    id: "repost-aashish-1",
    postId: "mock-4",
    by: AASHISH,
    bySlug: "aashish-k",
    postedAt: "4h ago",
  },
];

/**
 * Threads, by post id. Only the Cedar Gate question has one written out; the
 * rest open to an empty state rather than an error, which is the honest shape
 * of "not mocked yet".
 */
export const MOCK_COMMENTS: Record<string, MockComment[]> = {
  "mock-1": [
    {
      id: "c1",
      author: BISHAL,
      content:
        "Mostly Node and Postgres last I heard, they moved off a Rails monolith about a year ago. Ask about their on-call rotation in the interview too, that's usually where people get surprised.",
      postedAt: "1h ago",
      dhog: 71,
      replies: [
        {
          id: "c1-r1",
          author: AASHISH,
          content: "This is exactly what I needed, thank you!",
          postedAt: "48m ago",
          dhog: 4,
          replies: [],
        },
      ],
    },
    {
      id: "c2",
      author: NISHA,
      content: "Following, I have the same interview next month.",
      postedAt: "40m ago",
      dhog: 6,
      replies: [],
    },
  ],
};

export function commentsFor(postId: string): MockComment[] {
  return MOCK_COMMENTS[postId] ?? [];
}

/** Everything in the tree, replies included. */
export function countComments(comments: MockComment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

/* --- Right rail ---------------------------------------------------------- */

export type MockLeader = {
  name: string;
  detail: string;
  /**
   * Weekly dhog — a rolling seven days, and the ONLY number the leaderboard
   * reads. Lifetime totals never appear here on purpose: a board ranked on
   * lifetime is owned forever by whoever joined first.
   */
  weeklyDhog: number;
};

/** Top dhog this week. Suman G.'s detail is invented — no post of theirs here. */
export const MOCK_LEADERBOARD: MockLeader[] = [
  { name: "Bishal T.", detail: "Engineering Lead · Lalitpur", weeklyDhog: 1240 },
  { name: "Nisha R.", detail: "Backend Engineer · Kathmandu", weeklyDhog: 980 },
  { name: "Priya S.", detail: "Product Designer · Pokhara", weeklyDhog: 875 },
  { name: "Aashish K.", detail: "Software Engineer · Kathmandu", weeklyDhog: 640 },
  { name: "Suman G.", detail: "Data Analyst · Biratnagar", weeklyDhog: 512 },
];

/**
 * Hardcoded for this pass. Supabase Realtime presence replaces it once the UI
 * is signed off — nothing here counts anybody.
 */
export const MOCK_ACTIVE_NOW = 142;

/* --- Notifications ------------------------------------------------------- */

export type MockNotification = {
  id: string;
  /**
   * "activity" is a line of text and nothing else. "sathi-request" is somebody
   * asking to connect, and carries Accept / Decline in the panel — the bell is
   * where those are answered, rather than a page of their own.
   */
  kind: "activity" | "sathi-request";
  text: string;
  postedAt: string;
  unread: boolean;
  /** Whose request it is. Only on "sathi-request". */
  personSlug?: string;
};

/**
 * What the bell shows. Written for the logged-in user (Bishal) and hardcoded:
 * nothing generates these, and nothing marks them read anywhere but in the
 * open panel's own state.
 */
export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: "notif-sathi-suman",
    kind: "sathi-request",
    personSlug: "suman-g",
    text: "Suman G. wants to be your Sathi",
    postedAt: "1h ago",
    unread: true,
  },
  {
    id: "notif-1",
    kind: "activity",
    text: "Aashish K. gave dhog to your answer on the Cedar Gate question",
    postedAt: "2h ago",
    unread: true,
  },
  {
    id: "notif-2",
    kind: "activity",
    text: "Nisha R. replied to your comment",
    postedAt: "5h ago",
    unread: true,
  },
  {
    id: "notif-3",
    kind: "activity",
    text: "Your career story post passed 100 dhog",
    postedAt: "Yesterday",
    unread: false,
  },
];

/* --- Sathi connections ----------------------------------------------------
 *
 * A Sathi is a mutual connection — साथी, "friend" — and it is the one
 * relationship the product has. Stored as undirected pairs rather than as a
 * list hanging off each person, because that is what it is: there is no way to
 * be somebody's Sathi without them being yours, and a pair cannot get half
 * written the way two arrays can drift apart.
 *
 * Every count on every profile is derived from these, so nothing has a "Sathi
 * count" field that could disagree with the connections themselves.
 * ------------------------------------------------------------------------- */

/** Undirected pairs of profile slugs. Order within a pair is irrelevant. */
export const MOCK_SATHI_EDGES: [string, string][] = [
  ["bishal-t", "aashish-k"],
  ["bishal-t", "nisha-r"],
  ["aashish-k", "priya-s"],
  ["aashish-k", "suman-g"],
  ["nisha-r", "priya-s"],
];

/**
 * Sathi requests sent TO the signed-in user and not yet answered. Suman is
 * waiting on Bishal, which is what the bell has an Accept / Decline for.
 */
export const MOCK_SATHI_REQUESTS_IN: string[] = ["suman-g"];

/* --- Niches -------------------------------------------------------------- */

export type MockNiche = {
  slug: string;
  name: string;
  emoji: string;
  description: string;
};

/** Stands in for the niches table until the feed reads real data. */
export const MOCK_NICHES: MockNiche[] = [
  {
    slug: "tech",
    name: "Tech",
    emoji: "💻",
    description:
      "People who write, ship, and maintain software for a living — in Kathmandu, in Pokhara, and abroad. Ask them about breaking in, levelling up, and what the job is actually like.",
  },
];

export function findMockNiche(slug: string | undefined): MockNiche | null {
  if (!slug) return null;
  return MOCK_NICHES.find((niche) => niche.slug === slug) ?? null;
}

/**
 * Where a post goes when nothing says otherwise.
 *
 * Tech is the only live niche, so the composer states it rather than asking.
 * This constant is the seam: when a second niche opens, the composer's fixed
 * label becomes a picker and this stops being the answer for everybody.
 */
export const DEFAULT_NICHE = MOCK_NICHES[0];

/** The niche a post belongs to, falling back to the only one that is open. */
export function nicheForPost(post: { niche?: string }): MockNiche {
  return findMockNiche(post.niche) ?? DEFAULT_NICHE;
}

/* --- Profile detail ------------------------------------------------------ */

/** One line in a LinkedIn-style section. Organisation and dates are optional
 *  because the mock brief only names them where they are actually known. */
export type ProfileEntry = {
  title: string;
  organization?: string;
  dates?: string;
  description?: string;
  /** Projects only: what it was built with. */
  skills?: string[];
  /** Projects only — draws the generated geometric placeholder. */
  thumbnail?: boolean;
};

/**
 * The short factual block on the identity panel. Only `from` is required —
 * the rest render if they are there, so a sparsely filled profile shows less
 * rather than showing invented placeholders.
 */
export type PersonalDetails = {
  from: string;
  born?: string;
  speaks?: string;
};

export type ProfileDetails = {
  /** First person, first thing on the More info tab. */
  about: string;
  personal: PersonalDetails;
  education: ProfileEntry[];
  experience: ProfileEntry[];
  projects: ProfileEntry[];
  certifications: ProfileEntry[];
};

/* --- People --------------------------------------------------------------
 *
 * Everyone who appears anywhere — in a post, a comment or the leaderboard — is
 * in here with a page of their own. Only Bishal has the full write-up; the
 * rest carry just what a post byline already knows about them, and their
 * profile shows exactly that much rather than padding it out.
 * ------------------------------------------------------------------------- */

export type MockPerson = MockAuthor & {
  slug: string;
  /** One line, for the compact identity panel. The long form lives in details. */
  tagline?: string;
  /**
   * Profile picture and cover image.
   *
   * In this pass these only ever hold an object URL made in the browser from a
   * file the user picked, so they last exactly as long as the tab. Nothing is
   * uploaded: real pictures need somewhere to put the bytes, which is the
   * Supabase Storage pass. Absent means the initials avatar and the woven
   * lattice band, which is what everybody starts with.
   */
  avatarUrl?: string;
  coverUrl?: string;
  linkedinUrl?: string;
  foundingProfessional?: boolean;
  details?: ProfileDetails;
};

/** The signed-in user is just a person with everything filled in. */
export type MockUser = MockPerson & {
  id: string;
  tagline: string;
  linkedinUrl: string;
  details: ProfileDetails;
};

/**
 * The single account the mock login signs you in as. Deliberately someone who
 * already exists in MOCK_POSTS, so the profile and the feed agree about who
 * they are and what they have written.
 */
export const MOCK_USER: MockUser = {
  ...BISHAL,
  slug: "bishal-t",
  id: "mock-user-bishal",
  foundingProfessional: true,
  tagline: "QA tester in 2016, no CS degree. Now leading the platform team at Cedar Gate.",
  linkedinUrl: "https://linkedin.com/in/bishal-t-demo",

  /*
   * No CS degree, deliberately — it is the whole point of his story and of the
   * career-story post in the feed. Cedar Gate being his current employer is
   * also why he could answer Aashish's question about their stack from the
   * inside.
   *
   * Organisations are only named where the brief names them; the two earlier
   * roles are left without one rather than inventing employers.
   */
  details: {
    about:
      "I started as a QA tester in 2016 with a business degree and zero formal CS background. Six years and a lot of stubborn Googling later, I'm leading the platform team at Cedar Gate. I post here because I wish someone had told me half of this when I was starting out — ask me anything about breaking into engineering without the traditional path.",

    personal: {
      from: "Lalitpur",
      born: "March 14, 1994",
      speaks: "Nepali, English",
    },

    education: [
      {
        title: "Bachelor's in Business Studies",
        organization: "Tribhuvan University",
        dates: "2012–2016",
      },
    ],
    experience: [
      {
        title: "Engineering Lead",
        organization: "Cedar Gate",
        dates: "2021–Present",
        description: "Leads the platform team.",
      },
      { title: "Software Engineer", dates: "2018–2021" },
      { title: "QA Tester", dates: "2016–2018" },
    ],
    projects: [
      {
        title: "Monolith to microservices migration",
        organization: "Cedar Gate",
        dates: "2022–2023",
        description:
          "Led the six-month migration of Cedar Gate's core Rails monolith into a set of Node/Postgres services, with zero customer-facing downtime.",
        skills: ["Node.js", "PostgreSQL", "Docker"],
        thumbnail: true,
      },
      {
        title: "Internal analytics dashboard",
        organization: "Cedar Gate",
        dates: "2021",
        description:
          "Built the internal dashboard 40+ engineers now use to track deploy health and on-call load, replacing a spreadsheet-based process.",
        skills: ["React", "TypeScript", "PostgreSQL"],
        thumbnail: true,
      },
    ],
    certifications: [
      { title: "AWS Certified Solutions Architect – Associate" },
      { title: "Certified Kubernetes Administrator (CKA)" },
    ],
  },
};

/** Everything this person has written, straight out of the feed's mock data. */
export function postsBy(person: { name: string }): MockPost[] {
  return MOCK_POSTS.filter((post) => post.author.name === person.name);
}

/** The directory the people search reads. */
export const MOCK_PEOPLE: MockPerson[] = [
  MOCK_USER,
  {
    ...AASHISH,
    slug: "aashish-k",
    tagline: "Interviewing, and asking a lot of questions on the way.",
    details: sparse(
      AASHISH,
      "Software engineer in Kathmandu. Currently interviewing, which is most of what I post about — if you have been through it recently I would like to hear how it went.",
    ),
  },
  {
    ...PRIYA,
    slug: "priya-s",
    tagline: "Product designer in Pokhara. I run free counselling sessions.",
    details: sparse(
      PRIYA,
      "Product designer in Pokhara. I run a free session most weekends for people trying to decide between frontend and backend — comment on one of my posts if you want a slot.",
    ),
  },
  {
    ...NISHA,
    slug: "nisha-r",
    tagline: "Backend engineer. Mostly here to argue about pay.",
    details: sparse(
      NISHA,
      "Backend engineer in Kathmandu. I turn up in the threads about what companies actually pay and what they are actually like to work at, because nobody told me either of those things.",
    ),
  },
  {
    ...SUMAN,
    slug: "suman-g",
    tagline: "Data analyst in Biratnagar.",
    details: sparse(SUMAN, "Data analyst in Biratnagar."),
  },
];

/**
 * A minimal profile for someone who has not written one. Their About line is
 * drawn from what the feed already shows about them; the résumé sections stay
 * empty and simply do not render, rather than being filled with invention.
 */
function sparse(person: MockAuthor, about: string): ProfileDetails {
  return {
    about,
    personal: { from: person.city },
    education: [],
    experience: [],
    projects: [],
    certifications: [],
  };
}

export function findPerson(slug: string | undefined): MockPerson | null {
  if (!slug) return null;
  return MOCK_PEOPLE.find((person) => person.slug === slug) ?? null;
}

export function personSlug(name: string): string | null {
  return MOCK_PEOPLE.find((person) => person.name === name)?.slug ?? null;
}

/**
 * Name search, client-side. Matches anywhere in the name, so "nis" and "R."
 * both find Nisha — which is what people actually type.
 */
export function searchPeople(query: string): MockPerson[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  return MOCK_PEOPLE.filter((person) => person.name.toLowerCase().includes(needle));
}

/* --- Kura (messages) ------------------------------------------------------
 *
 * "Kura" is a chat, in the ordinary sense of the word — the kind you have
 * rather than the kind you post. Two threads, written from Bishal's side,
 * because he is who the mock login signs you in as.
 *
 * Which of the two lists a thread appears in — Chats or Requests — is NOT
 * stored here. It is derived from whether you and the other person are Sathis,
 * so accepting somebody moves their thread across on its own and the two can
 * never disagree. Aashish is a Sathi, so his thread is a chat; Priya is not
 * yet, so hers is a request.
 *
 * `fromMe` is relative to the signed-in user and is a mock-phase shortcut: the
 * real shape is a sender_id compared against the viewer. It is a boolean here
 * so nothing has to know about ids to render a bubble on the correct side.
 * ------------------------------------------------------------------------- */

export type MockMessage = {
  id: string;
  /** Written by the signed-in user, so it hangs on the right in crimson. */
  fromMe: boolean;
  content: string;
  postedAt: string;
};

export type MockConversation = {
  id: string;
  /** The other person in it. */
  person: MockAuthor;
  /** Their profile, so a thread can say who it is with and link to them. */
  personSlug: string;
  messages: MockMessage[];
  /** Something came in that you have not opened. */
  unread: boolean;
};

export const MOCK_CONVERSATIONS: MockConversation[] = [
  /* Deliberately the unread one first: it is the newer thread, and it is what
     the unread badge on the collapsed bar is counting. */
  {
    id: "kura-priya",
    person: PRIYA,
    personSlug: "priya-s",
    unread: true,
    messages: [
      {
        id: "kura-priya-1",
        fromMe: false,
        content:
          "Saw your platform migration post — any tips for doing something similar at a smaller scale?",
        postedAt: "20m ago",
      },
    ],
  },
  {
    id: "kura-aashish",
    person: AASHISH,
    personSlug: "aashish-k",
    unread: false,
    messages: [
      {
        id: "kura-aashish-1",
        fromMe: false,
        content: "Hey, thanks again for the answer. Landed the interview.",
        postedAt: "2h ago",
      },
      {
        id: "kura-aashish-2",
        fromMe: true,
        content: "Nice! Let me know how it goes.",
        postedAt: "2h ago",
      },
    ],
  },
];
