/* ===========================================================================
 * The moderator's view of the same world.
 *
 * Everything else in this codebase is written from a member's side: what you
 * can see, what you are allowed to do. This file is the other side of the
 * glass — accounts rather than people, applications rather than professionals,
 * and a queue rather than a feed.
 *
 * It is kept out of feed-mock.ts on purpose. feed-mock holds what the site
 * shows its members; none of that should grow an `email` or a `suspended` flag
 * just because one internal page needs them. Same world, different projection,
 * separate file — and lib/api is still the only thing allowed to read either.
 *
 * Dates are stored as ISO strings computed at module load from "N days ago",
 * so a queue seeded once does not slowly read as ancient history. timeAgo()
 * renders them the same way it renders everything else.
 * ========================================================================= */

import { MOCK_PEOPLE, type MockPerson } from "@/lib/feed-mock";

const DAY = 24 * 60 * 60 * 1000;

/** ISO for "n days ago", so fixtures age with the session rather than rot. */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString();
}

/* --- Applications ----------------------------------------------------------
 *
 * One row per person who has asked to be listed as a professional. This is the
 * LinkedIn queue: the only question it exists to answer is whether the person
 * behind the link does the work they say they do, which is a human's call and
 * always will be.
 * ------------------------------------------------------------------------- */

export type ReviewStatus = "pending" | "verified" | "rejected";

export type MockApplication = {
  id: string;
  name: string;
  email: string;
  /** What they say they do — the claim being checked against the LinkedIn. */
  headline: string;
  city: string;
  nicheSlug: string;
  linkedinUrl: string;
  /** Their own words. Sometimes empty: thin applications are a real state. */
  bio: string;
  appliedAt: string;
  status: ReviewStatus;
  /** Set on rejection, and shown to them on /pending. */
  reviewNote?: string;
  reviewedAt?: string;
  /** Awarded on approval while founding slots remain. */
  foundingMember?: boolean;
  /** Their profile slug, once approved and a space exists. */
  slug?: string;
};

/**
 * Approving the first hundred professionals makes them founding members. The
 * number mirrors public.founding_cohort_size() so the mock queue and the real
 * one cannot disagree about when the badge stops being given out.
 */
export const FOUNDING_COHORT_SIZE = 100;

/**
 * The people already listed on the site, written back as the applications they
 * would have arrived as. Derived from MOCK_PEOPLE rather than retyped, so a
 * professional cannot exist on the site without a row here explaining how they
 * got in.
 */
const VERIFIED_APPLICATIONS: MockApplication[] = MOCK_PEOPLE.map((person, index) => ({
  id: `app-${person.slug}`,
  name: person.name,
  email: `${person.slug.replace(/-/g, ".")}@example.com`,
  headline: person.role,
  city: person.city,
  nicheSlug: "tech",
  linkedinUrl: person.linkedinUrl ?? `https://linkedin.com/in/${person.slug}`,
  bio: person.tagline ?? "",
  appliedAt: daysAgo(40 + index * 6),
  reviewedAt: daysAgo(38 + index * 6),
  status: "verified" as const,
  foundingMember: person.foundingProfessional ?? true,
  slug: person.slug,
}));

/** Waiting on a decision. The reason this screen exists. */
const PENDING_APPLICATIONS: MockApplication[] = [
  {
    id: "app-anjali-t",
    name: "Anjali Thapa",
    email: "anjali.thapa@example.com",
    headline: "Data Scientist",
    city: "Kathmandu",
    nicheSlug: "tech",
    linkedinUrl: "https://linkedin.com/in/anjali-thapa-demo",
    bio: "Four years doing forecasting work for a logistics company. I get asked how to move from analytics into ML often enough that I would rather answer it somewhere people can find the answer.",
    appliedAt: daysAgo(0.25),
    status: "pending",
  },
  {
    id: "app-sabina-m",
    name: "Sabina Maharjan",
    email: "sabina.maharjan@example.com",
    headline: "Product Manager",
    city: "Kathmandu",
    nicheSlug: "tech",
    linkedinUrl: "https://linkedin.com/in/sabina-maharjan-demo",
    bio: "PM at a fintech company, previously a developer. Happy to talk about the switch, and about what a PM actually does all day, which nobody explained to me either.",
    appliedAt: daysAgo(2),
    status: "pending",
  },
  {
    id: "app-rajesh-g",
    name: "Rajesh Gurung",
    email: "rajesh.gurung@example.com",
    headline: "DevOps Engineer",
    city: "Pokhara",
    nicheSlug: "tech",
    linkedinUrl: "https://linkedin.com/in/rajesh-gurung-demo",
    bio: "Infrastructure, mostly AWS and Kubernetes. Working remotely from Pokhara for a company in Singapore, which is its own topic people ask about.",
    appliedAt: daysAgo(4),
    status: "pending",
  },
  {
    /*
     * Deliberately thin: no bio, a generic headline, and the oldest thing in
     * the queue. A moderator needs somewhere to practise the decision they
     * will actually find hard, not four applications that all say yes.
     */
    id: "app-kiran-s",
    name: "Kiran Shrestha",
    email: "kiran.shrestha@example.com",
    headline: "Developer",
    city: "Bhaktapur",
    nicheSlug: "tech",
    linkedinUrl: "https://linkedin.com/in/kiran-shrestha-demo",
    bio: "",
    appliedAt: daysAgo(9),
    status: "pending",
  },
];

/** Already turned down. Kept, because the note is shown to them on /pending. */
const REJECTED_APPLICATIONS: MockApplication[] = [
  {
    id: "app-deepak-b",
    name: "Deepak Bhandari",
    email: "deepak.bhandari@example.com",
    headline: "Senior Architect",
    city: "Kathmandu",
    nicheSlug: "tech",
    linkedinUrl: "https://linkedin.com/in/deepak-bhandari-demo",
    bio: "Twenty years in enterprise software.",
    appliedAt: daysAgo(21),
    reviewedAt: daysAgo(20),
    status: "rejected",
    reviewNote:
      "Profile is set to private, so we could not confirm the role. Happy to look again if you open it up.",
  },
  {
    id: "app-manish-k",
    name: "Manish Karki",
    email: "manish.karki@example.com",
    headline: "Full Stack Developer",
    city: "Lalitpur",
    nicheSlug: "tech",
    linkedinUrl: "https://linkedin.com/in/manish-karki-demo",
    bio: "Currently studying, building projects on the side.",
    appliedAt: daysAgo(15),
    reviewedAt: daysAgo(14),
    status: "rejected",
    reviewNote:
      "This reads as a student rather than someone working the job. You are very welcome here as a learner — reapply once you are working.",
  },
];

export const MOCK_APPLICATIONS: MockApplication[] = [
  ...PENDING_APPLICATIONS,
  ...VERIFIED_APPLICATIONS,
  ...REJECTED_APPLICATIONS,
];

/* --- Accounts --------------------------------------------------------------
 *
 * Everyone with a login, which is a wider set than everyone with a profile:
 * learners are most of the site and never go through review at all. The
 * moderator list has to show them, or "who is on this site" quietly means
 * "which professionals are on this site", which is the smaller half.
 * ------------------------------------------------------------------------- */

export type AccountRole = "admin" | "professional" | "learner";

export type MockAccount = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  city: string;
  joinedAt: string;
  /** Professionals only — a learner has nothing to be verified about. */
  review?: ReviewStatus;
  /** Set once they have a profile page worth linking to. */
  slug?: string;
  suspended?: boolean;
};

/** The professionals, from the same fixture the rest of the site reads. */
const PROFESSIONAL_ACCOUNTS: MockAccount[] = MOCK_PEOPLE.map((person, index) => ({
  id: `acct-${person.slug}`,
  name: person.name,
  email: `${person.slug.replace(/-/g, ".")}@example.com`,
  role: "professional" as const,
  city: person.city,
  joinedAt: daysAgo(38 + index * 6),
  review: "verified" as const,
  slug: person.slug,
}));

/** Applicants waiting on review already have an account; they can use the site. */
const APPLICANT_ACCOUNTS: MockAccount[] = PENDING_APPLICATIONS.map((application) => ({
  id: `acct-${application.id}`,
  name: application.name,
  email: application.email,
  role: "learner" as const,
  city: application.city,
  joinedAt: application.appliedAt,
  review: "pending" as const,
}));

const LEARNER_ACCOUNTS: MockAccount[] = [
  {
    id: "acct-sujata-a",
    name: "Sujata Adhikari",
    email: "sujata.adhikari@example.com",
    role: "learner",
    city: "Kathmandu",
    joinedAt: daysAgo(3),
  },
  {
    id: "acct-bibek-r",
    name: "Bibek Rai",
    email: "bibek.rai@example.com",
    role: "learner",
    city: "Dharan",
    joinedAt: daysAgo(8),
  },
  {
    id: "acct-pooja-s",
    name: "Pooja Subedi",
    email: "pooja.subedi@example.com",
    role: "learner",
    city: "Butwal",
    joinedAt: daysAgo(12),
  },
  {
    id: "acct-arjun-l",
    name: "Arjun Limbu",
    email: "arjun.limbu@example.com",
    role: "learner",
    city: "Biratnagar",
    joinedAt: daysAgo(19),
  },
  {
    id: "acct-sarita-p",
    name: "Sarita Poudel",
    email: "sarita.poudel@example.com",
    role: "learner",
    city: "Pokhara",
    joinedAt: daysAgo(27),
    /* Suspended so the state is visible somewhere without anyone having to
       create it first — every status in the model should be reachable by
       looking, not only by clicking. */
    suspended: true,
  },
  {
    id: "acct-nabin-c",
    name: "Nabin Chaudhary",
    email: "nabin.chaudhary@example.com",
    role: "learner",
    city: "Janakpur",
    joinedAt: daysAgo(33),
  },
];

/** You. The one account that can see any of this. */
const MODERATOR_ACCOUNT: MockAccount = {
  id: "acct-moderator",
  name: "Pratham Dangol",
  email: "pratham@sathi.np",
  role: "admin",
  city: "Kathmandu",
  joinedAt: daysAgo(64),
};

export const MOCK_ACCOUNTS: MockAccount[] = [
  MODERATOR_ACCOUNT,
  ...PROFESSIONAL_ACCOUNTS,
  ...APPLICANT_ACCOUNTS,
  ...LEARNER_ACCOUNTS,
];

/* --- Derived numbers -------------------------------------------------------
 *
 * Counted from the lists above rather than stored, for the same reason Sathi
 * counts are: a number that is kept alongside the thing it counts is a number
 * that will eventually disagree with it.
 * ------------------------------------------------------------------------- */

export type ModerationSummary = {
  pending: number;
  accounts: number;
  professionals: number;
  learners: number;
  suspended: number;
  posts: number;
  dhog: number;
  foundingSlotsLeft: number;
  /** How long the oldest undecided application has been waiting, in days. */
  oldestPendingDays: number | null;
};

export function summarise(
  applications: MockApplication[],
  accounts: MockAccount[],
  posts: { dhog: number }[],
): ModerationSummary {
  const pending = applications.filter((a) => a.status === "pending");
  const verified = applications.filter((a) => a.status === "verified").length;

  const oldest = pending.reduce<number | null>((oldestSoFar, application) => {
    const days = (Date.now() - new Date(application.appliedAt).getTime()) / DAY;
    return oldestSoFar === null || days > oldestSoFar ? days : oldestSoFar;
  }, null);

  return {
    pending: pending.length,
    accounts: accounts.length,
    professionals: accounts.filter((a) => a.role === "professional").length,
    learners: accounts.filter((a) => a.role === "learner").length,
    suspended: accounts.filter((a) => a.suspended).length,
    posts: posts.length,
    dhog: posts.reduce((total, post) => total + post.dhog, 0),
    foundingSlotsLeft: Math.max(0, FOUNDING_COHORT_SIZE - verified),
    oldestPendingDays: oldest === null ? null : Math.floor(oldest),
  };
}

/**
 * How many posts each person has written, by name — the one number a moderator
 * looking at an account actually wants, and the cheapest signal for whether a
 * professional is active or just verified.
 *
 * Counted from the posts the caller has already loaded, not from the fixture:
 * removing a post in one tab has to change the count in another, and reading
 * the fixture here would have left the two disagreeing.
 */
export function postCountsByAuthor(posts: { author: { name: string } }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    counts.set(post.author.name, (counts.get(post.author.name) ?? 0) + 1);
  }
  return counts;
}

/** Oldest first: a queue is worked from the end that has waited longest. */
export function byLongestWaiting(a: MockApplication, b: MockApplication): number {
  return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
}

/** Newest first, for lists where recency is the useful order. */
export function byNewest(a: { joinedAt: string }, b: { joinedAt: string }): number {
  return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
}

export type { MockPerson };
