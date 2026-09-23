"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useToast } from "@/components/toast";
import {
  approveApplication,
  deletePost,
  getAccounts,
  getApplications,
  getFeedPosts,
  rejectApplication,
  setAccountSuspended,
} from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import { timeAgo } from "@/lib/format";
import {
  FOUNDING_COHORT_SIZE,
  byLongestWaiting,
  byNewest,
  postCountsByAuthor,
  summarise,
  type AccountRole,
  type MockAccount,
  type MockApplication,
  type ReviewStatus,
} from "@/lib/moderation";
import type { MockPost } from "@/lib/feed-mock";

/* ===========================================================================
 * Darbar — दरबार, "the court". The moderator console.
 *
 * Four sections, in the order the job is actually done: what needs attention,
 * the queue that creates most of it, the people, and what they wrote.
 *
 * Tabs rather than routes. The mock store lives in the tab's memory, so a full
 * navigation between sections would throw away every decision made since the
 * page loaded — which on a console whose whole purpose is making decisions is
 * the one thing it must not do. When this reads real data the sections can
 * become routes; until then they must not.
 *
 * Every read and write goes through lib/api, like the rest of the app. Nothing
 * in here touches a fixture directly.
 * ========================================================================= */

type Section = "overview" | "review" | "people" | "posts";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "review", label: "Review queue" },
  { key: "people", label: "People" },
  { key: "posts", label: "Posts" },
];

export function ModeratorConsole() {
  const [section, setSection] = useState<Section>("overview");

  const {
    data: applications,
    loading: loadingApplications,
    reload: reloadApplications,
  } = useAsync<MockApplication[]>(getApplications, []);
  const { data: accounts, reload: reloadAccounts } = useAsync<MockAccount[]>(getAccounts, []);
  const { data: posts, reload: reloadPosts } = useAsync<MockPost[]>(getFeedPosts, []);

  const summary = useMemo(
    () => summarise(applications, accounts, posts),
    [applications, accounts, posts],
  );

  /** A decision touches both lists, so both are re-read rather than patched. */
  function reloadAfterReview() {
    reloadApplications();
    reloadAccounts();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="border-line mt-6 flex flex-wrap gap-1 border-b" aria-label="Console sections">
        {SECTIONS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSection(tab.key)}
            aria-current={section === tab.key ? "page" : undefined}
            className={`-mb-px border-b-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
              section === tab.key
                ? "border-crimson text-crimson"
                : "text-ink-soft hover:text-ink border-transparent"
            }`}
          >
            {tab.label}
            {tab.key === "review" && summary.pending > 0 ? (
              <span className="bg-crimson text-on-accent ml-2 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold">
                {summary.pending}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {section === "overview" ? (
          <Overview
            summary={summary}
            applications={applications}
            loading={loadingApplications}
            onGoToQueue={() => setSection("review")}
          />
        ) : null}

        {section === "review" ? (
          <ReviewQueue
            applications={applications}
            loading={loadingApplications}
            foundingSlotsLeft={summary.foundingSlotsLeft}
            onReviewed={reloadAfterReview}
          />
        ) : null}

        {section === "people" ? (
          <People accounts={accounts} posts={posts} onChanged={reloadAccounts} />
        ) : null}

        {section === "posts" ? <Posts posts={posts} onChanged={reloadPosts} /> : null}
      </div>
    </div>
  );
}

/* --- Overview ------------------------------------------------------------- */

function Overview({
  summary,
  applications,
  loading,
  onGoToQueue,
}: {
  summary: ReturnType<typeof summarise>;
  applications: MockApplication[];
  loading: boolean;
  onGoToQueue: () => void;
}) {
  const waiting = applications.filter((a) => a.status === "pending").sort(byLongestWaiting);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-ink-faint text-[0.68rem] font-bold tracking-[0.14em] uppercase">
          Right now
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile
            label="Waiting on you"
            value={summary.pending}
            tone={summary.pending > 0 ? "crimson" : "plain"}
          />
          <StatTile label="Accounts" value={summary.accounts} />
          <StatTile label="Professionals" value={summary.professionals} />
          <StatTile label="Learners" value={summary.learners} />
          <StatTile label="Posts" value={summary.posts} />
          <StatTile
            label="Suspended"
            value={summary.suspended}
            tone={summary.suspended > 0 ? "crimson" : "plain"}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-display text-xl">The queue</h3>
          {loading ? (
            <p className="text-ink-faint mt-2 text-sm">Reading…</p>
          ) : waiting.length === 0 ? (
            <p className="text-ink-soft mt-2 text-sm">
              Nothing waiting. Every application has been decided.
            </p>
          ) : (
            <>
              <p className="text-ink-soft mt-2 text-sm">
                {waiting.length} {waiting.length === 1 ? "person has" : "people have"} asked to be
                listed as a professional.
                {summary.oldestPendingDays !== null && summary.oldestPendingDays >= 7 ? (
                  <>
                    {" "}
                    The oldest has been waiting{" "}
                    <strong className="text-crimson">{summary.oldestPendingDays} days</strong>.
                  </>
                ) : null}
              </p>
              <ul className="mt-3 space-y-1.5">
                {waiting.slice(0, 3).map((application) => (
                  <li key={application.id} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold">{application.name}</span>
                    <span className="text-ink-faint shrink-0 text-xs">
                      {timeAgo(application.appliedAt)}
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={onGoToQueue} className="btn btn-primary btn-sm mt-4">
                Work the queue
              </button>
            </>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-display text-xl">Founding cohort</h3>
          <p className="text-ink-soft mt-2 text-sm">
            The first {FOUNDING_COHORT_SIZE} verified professionals are marked founding members.
            Approving someone while slots remain gives them the badge automatically.
          </p>
          <p className="mt-3 text-2xl font-bold">
            <span className={summary.foundingSlotsLeft === 0 ? "text-ink-faint" : "text-turmeric"}>
              {summary.foundingSlotsLeft}
            </span>{" "}
            <span className="text-ink-soft text-sm font-semibold">
              slot{summary.foundingSlotsLeft === 1 ? "" : "s"} left
            </span>
          </p>
          <p className="text-ink-faint mt-3 text-xs">
            Total dhog given across the site: {summary.dhog.toLocaleString()}
          </p>
        </div>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: number;
  tone?: "plain" | "crimson";
}) {
  return (
    <div className="card-soft px-4 py-3">
      <p className="text-ink-faint text-[0.62rem] font-bold tracking-[0.12em] uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "crimson" ? "text-crimson" : ""}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

/* --- Review queue ----------------------------------------------------------
 *
 * The LinkedIn check. Open the link, decide whether the person behind it does
 * the work they say they do, approve or reject with a reason. That is the
 * entire job and the screen tries not to imply otherwise.
 * ------------------------------------------------------------------------- */

const REVIEW_TABS: { key: ReviewStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
];

function ReviewQueue({
  applications,
  loading,
  foundingSlotsLeft,
  onReviewed,
}: {
  applications: MockApplication[];
  loading: boolean;
  foundingSlotsLeft: number;
  onReviewed: () => void;
}) {
  const [status, setStatus] = useState<ReviewStatus>("pending");

  const rows = applications
    .filter((application) => application.status === status)
    // Pending is worked oldest-first; decided lists read newest-first, because
    // there the useful question is "what did I just do", not "what is stalest".
    .sort((a, b) => (status === "pending" ? byLongestWaiting(a, b) : byLongestWaiting(b, a)));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">Review queue</h2>
          <p className="text-ink-soft mt-1 text-sm">
            Open the LinkedIn, decide whether they do the work they say they do. That is the whole
            job.
          </p>
        </div>
        <div className="card-soft px-4 py-2 text-sm">
          <span className={foundingSlotsLeft === 0 ? "text-ink-faint" : "text-turmeric"}>
            {foundingSlotsLeft} founding slot{foundingSlotsLeft === 1 ? "" : "s"} left
          </span>
        </div>
      </div>

      <nav className="border-line mt-5 flex gap-1 border-b">
        {REVIEW_TABS.map((tab) => {
          const count = applications.filter((a) => a.status === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              aria-current={status === tab.key ? "page" : undefined}
              className={`-mb-px border-b-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
                status === tab.key
                  ? "border-crimson text-crimson"
                  : "text-ink-soft hover:text-ink border-transparent"
              }`}
            >
              {tab.label}
              <span className="text-ink-faint ml-1.5 text-xs font-medium">{count}</span>
            </button>
          );
        })}
      </nav>

      {loading ? (
        <p className="text-ink-faint mt-8 text-sm">Reading…</p>
      ) : rows.length === 0 ? (
        <div className="card-soft mt-6 p-10 text-center">
          <p className="font-display text-2xl">Nothing here.</p>
          <p className="text-ink-soft mt-2 text-sm">
            {status === "pending"
              ? "No applications waiting. Enjoy it."
              : `No ${status} applications yet.`}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              willBeFounding={foundingSlotsLeft > 0}
              onReviewed={onReviewed}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ApplicationCard({
  application,
  willBeFounding,
  onReviewed,
}: {
  application: MockApplication;
  willBeFounding: boolean;
  onReviewed: () => void;
}) {
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    await approveApplication(application.id);
    toast(`${application.name} is verified.`);
    onReviewed();
    setBusy(false);
  }

  async function reject() {
    setBusy(true);
    await rejectApplication(application.id, note);
    toast(`${application.name} was turned down.`, "info");
    setRejecting(false);
    setNote("");
    onReviewed();
    setBusy(false);
  }

  return (
    <li className="card p-5">
      <div className="flex items-start gap-4">
        <Avatar name={application.name} size={48} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-xl leading-tight">{application.name}</h3>
            <span className="text-ink-faint text-xs font-medium">
              applied {timeAgo(application.appliedAt)}
            </span>
            {application.foundingMember ? (
              <span className="stamp stamp-founding">Founding</span>
            ) : null}
          </div>

          <p className="text-ink-soft mt-0.5 text-sm">
            {application.headline} · {application.city}
          </p>
          <p className="text-ink-faint mt-0.5 text-xs">{application.email}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <a
              href={application.linkedinUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-indigo btn-sm"
            >
              Open LinkedIn ↗
            </a>
          </div>

          {application.bio ? (
            <p className="prose-post text-ink-soft mt-3 text-sm">{application.bio}</p>
          ) : (
            <p className="text-ink-faint mt-3 text-sm italic">
              No bio written — nothing to check the link against but the headline.
            </p>
          )}

          {application.reviewNote ? (
            <p className="border-line text-ink-soft mt-3 border-l-2 pl-3 text-sm italic">
              {application.reviewNote}
            </p>
          ) : null}

          {application.status === "pending" ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={approve}
                  disabled={busy}
                  className="btn btn-primary btn-sm"
                >
                  {busy && !rejecting ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting((value) => !value)}
                  disabled={busy}
                  className="btn btn-paper btn-sm"
                >
                  {rejecting ? "Cancel" : "Reject"}
                </button>
                {willBeFounding ? (
                  <span className="stamp stamp-founding">Will be founding</span>
                ) : null}
              </div>

              {rejecting ? (
                <div className="mt-3">
                  <label className="field-label" htmlFor={`note-${application.id}`}>
                    Reason (shown to them)
                  </label>
                  <textarea
                    id={`note-${application.id}`}
                    rows={2}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="field resize-y"
                    placeholder="Profile is private, so we could not confirm the role."
                  />
                  {/* A rejection with no reason reaches them as a blank on
                      /pending, which is worse than a plain no — so the button
                      waits for one rather than letting it be skipped. */}
                  <button
                    type="button"
                    onClick={reject}
                    disabled={busy || note.trim().length === 0}
                    className="btn btn-indigo btn-sm mt-2"
                  >
                    {busy ? "Rejecting…" : "Confirm rejection"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : application.status === "verified" && application.slug ? (
            <Link
              href={`/profile/${application.slug}`}
              className="link-ink mt-3 inline-block text-sm font-semibold"
            >
              View their profile
            </Link>
          ) : (
            <p className="text-ink-faint mt-3 text-xs">
              {application.status === "rejected" ? "Rejected" : "Verified"}{" "}
              {application.reviewedAt ? timeAgo(application.reviewedAt) : ""}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/* --- People ----------------------------------------------------------------
 *
 * Everyone with a login, which is a wider set than everyone with a profile.
 * Learners are most of the site and never appear anywhere else in an admin
 * view, so leaving them out would quietly redefine "who is on this site" as
 * "which professionals are on this site".
 * ------------------------------------------------------------------------- */

const ROLE_FILTERS: { key: AccountRole | "all"; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "professional", label: "Professionals" },
  { key: "learner", label: "Learners" },
  { key: "admin", label: "Admins" },
];

function People({
  accounts,
  posts,
  onChanged,
}: {
  accounts: MockAccount[];
  posts: MockPost[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AccountRole | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const postCounts = useMemo(() => postCountsByAuthor(posts), [posts]);

  const rows = accounts
    .filter((account) => (role === "all" ? true : account.role === role))
    .filter((account) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return (
        account.name.toLowerCase().includes(needle) || account.email.toLowerCase().includes(needle)
      );
    })
    .sort(byNewest);

  async function toggleSuspended(account: MockAccount) {
    setBusyId(account.id);
    await setAccountSuspended(account.id, !account.suspended);
    toast(
      account.suspended ? `${account.name} can sign in again.` : `${account.name} is suspended.`,
      account.suspended ? "ok" : "info",
    );
    onChanged();
    setBusyId(null);
  }

  return (
    <div>
      <h2 className="font-display text-2xl">People</h2>
      <p className="text-ink-soft mt-1 text-sm">
        Everyone with an account — {accounts.length} in total.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search people"
          /* `field` for the box itself — field-search alone is only a padding
             modifier and leaves the input with no border at all. Fixed basis
             rather than max-w: as a flex child beside the filter chips it was
             being shrunk until the placeholder was cut off. */
          className="field w-full shrink-0 sm:w-72"
        />
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setRole(filter.key)}
              aria-pressed={role === filter.key}
              className={`chip transition-colors ${
                role === filter.key ? "bg-selected text-on-selected border-crimson" : ""
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card-soft mt-6 p-10 text-center">
          <p className="font-display text-xl">Nobody matches that.</p>
        </div>
      ) : (
        /* Horizontally scrollable rather than collapsing to cards: a moderator
           comparing accounts wants the columns to line up, and on a phone a
           sideways nudge is a smaller cost than losing that. */
        <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-line text-ink-faint border-b text-left">
                <th
                  scope="col"
                  className="py-2 pr-3 text-[0.68rem] font-bold tracking-[0.1em] uppercase"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="py-2 pr-3 text-[0.68rem] font-bold tracking-[0.1em] uppercase"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="py-2 pr-3 text-[0.68rem] font-bold tracking-[0.1em] uppercase"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="py-2 pr-3 text-[0.68rem] font-bold tracking-[0.1em] uppercase"
                >
                  Joined
                </th>
                <th
                  scope="col"
                  className="py-2 pr-3 text-[0.68rem] font-bold tracking-[0.1em] uppercase"
                >
                  Posts
                </th>
                <th
                  scope="col"
                  className="py-2 text-right text-[0.68rem] font-bold tracking-[0.1em] uppercase"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <tr key={account.id} className="border-line-soft border-b last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={account.name} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {account.slug ? (
                            <Link href={`/profile/${account.slug}`} className="link-ink">
                              {account.name}
                            </Link>
                          ) : (
                            account.name
                          )}
                        </p>
                        <p className="text-ink-faint truncate text-xs">{account.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <RoleTag role={account.role} />
                  </td>
                  <td className="py-3 pr-3">
                    {account.suspended ? (
                      <span className="text-crimson text-xs font-bold">Suspended</span>
                    ) : account.review === "pending" ? (
                      <span className="text-indigo text-xs font-semibold">Awaiting review</span>
                    ) : account.review === "rejected" ? (
                      <span className="text-ink-faint text-xs font-semibold">Turned down</span>
                    ) : account.review === "verified" ? (
                      <span className="text-jade text-xs font-semibold">Verified</span>
                    ) : (
                      <span className="text-ink-faint text-xs">—</span>
                    )}
                  </td>
                  <td className="text-ink-soft py-3 pr-3 text-xs whitespace-nowrap">
                    {timeAgo(account.joinedAt)}
                  </td>
                  <td className="text-ink-soft py-3 pr-3 text-xs">
                    {postCounts.get(account.name) ?? 0}
                  </td>
                  <td className="py-3 text-right">
                    {account.role === "admin" ? (
                      /* No self-suspension: the console would lock its only
                         operator out of the console. */
                      <span className="text-ink-faint text-xs">—</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSuspended(account)}
                        disabled={busyId === account.id}
                        className="btn btn-paper btn-sm"
                      >
                        {busyId === account.id
                          ? "Saving…"
                          : account.suspended
                            ? "Restore"
                            : "Suspend"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoleTag({ role }: { role: AccountRole }) {
  const label = role === "professional" ? "Professional" : role === "admin" ? "Admin" : "Learner";
  const tone =
    role === "professional"
      ? "border-crimson text-crimson"
      : role === "admin"
        ? "border-turmeric text-turmeric"
        : "border-line text-ink-soft";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[0.68rem] font-bold ${tone}`}
    >
      {label}
    </span>
  );
}

/* --- Posts -----------------------------------------------------------------
 *
 * Content moderation, which is a different decision from account moderation:
 * taking down one bad answer is not the same as taking away someone's login,
 * and the console keeps them apart so neither gets used as a shortcut for the
 * other.
 * ------------------------------------------------------------------------- */

function Posts({ posts, onChanged }: { posts: MockPost[]; onChanged: () => void }) {
  const { toast } = useToast();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(post: MockPost) {
    setBusyId(post.id);
    await deletePost(post.id);
    toast("Post removed.", "info");
    setConfirmingId(null);
    onChanged();
    setBusyId(null);
  }

  return (
    <div>
      <h2 className="font-display text-2xl">Posts</h2>
      <p className="text-ink-soft mt-1 text-sm">
        Everything on the site — {posts.length} {posts.length === 1 ? "post" : "posts"}.
      </p>

      {posts.length === 0 ? (
        <div className="card-soft mt-6 p-10 text-center">
          <p className="font-display text-xl">Nothing posted yet.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="card p-4">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="font-semibold">{post.author.name}</span>
                <span className="text-ink-faint text-xs">{post.author.role}</span>
                <span className="text-ink-faint text-xs">· {post.postedAt}</span>
                <span className="chip ml-auto text-[0.68rem]">{post.type}</span>
              </div>

              <p className="prose-post text-ink-soft mt-2 line-clamp-3 text-sm">{post.content}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-ink-faint text-xs">
                  {post.dhog} dhog · {post.comments} {post.comments === 1 ? "reply" : "replies"}
                </span>

                <Link href={`/post/${post.id}`} className="link-ink text-xs font-semibold">
                  Open
                </Link>

                {confirmingId === post.id ? (
                  <button
                    type="button"
                    onClick={() => remove(post)}
                    disabled={busyId === post.id}
                    className="btn btn-primary btn-sm ml-auto"
                  >
                    {busyId === post.id ? "Removing…" : "Really remove?"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(post.id)}
                    className="btn btn-paper btn-sm ml-auto"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
