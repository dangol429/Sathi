import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { ReviewActions } from "@/components/review-actions";
import { requireAdmin } from "@/lib/auth";
import { getReviewQueue, getVerifiedCount } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import type { VerificationStatus } from "@/lib/database.types";

export const metadata: Metadata = { title: "Review queue", robots: { index: false } };
export const dynamic = "force-dynamic";

const FOUNDING_COHORT_SIZE = 100; // mirrors public.founding_cohort_size()
const TABS: { key: VerificationStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
];

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin("/admin/review");

  const { status } = await searchParams;
  const active: VerificationStatus = TABS.some((tab) => tab.key === status)
    ? (status as VerificationStatus)
    : "pending";

  const [rows, verifiedCount] = await Promise.all([getReviewQueue(active), getVerifiedCount()]);

  const foundingSlotsLeft = Math.max(0, FOUNDING_COHORT_SIZE - verifiedCount);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Internal · admins only</p>
          <h1 className="mt-2 text-4xl">Review queue</h1>
          <p className="text-ink-soft mt-2">
            Open the LinkedIn, decide whether they do the work they say they do. That is the whole
            job.
          </p>
        </div>

        <div className="card-soft px-4 py-3 text-sm">
          <p className="text-ink-faint text-[0.68rem] font-bold tracking-[0.14em] uppercase">
            Founding cohort
          </p>
          <p className="mt-1 font-semibold">
            {verifiedCount} verified ·{" "}
            <span className={foundingSlotsLeft === 0 ? "text-ink-faint" : "text-turmeric"}>
              {foundingSlotsLeft} founding slot{foundingSlotsLeft === 1 ? "" : "s"} left
            </span>
          </p>
        </div>
      </div>

      <nav className="border-line mt-8 flex gap-1 border-b">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/review?status=${tab.key}`}
            className={`-mb-px border-b-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
              active === tab.key
                ? "border-crimson text-crimson"
                : "text-ink-soft hover:text-ink border-transparent"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="card-soft mt-8 p-10 text-center">
          <p className="font-display text-2xl">Nothing here.</p>
          <p className="text-ink-soft mt-2 text-sm">
            {active === "pending"
              ? "No applications waiting. Enjoy it."
              : `No ${active} professionals yet.`}
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="card p-5">
              <div className="flex items-start gap-4">
                <Avatar name={row.display_name} src={row.user?.avatar_url} size={48} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-xl leading-tight">{row.display_name}</h2>
                    <span className="text-ink-faint text-xs font-medium">
                      applied {timeAgo(row.created_at)}
                    </span>
                    {row.founding_member ? (
                      <span className="stamp stamp-founding">Founding</span>
                    ) : null}
                  </div>

                  {row.headline ? (
                    <p className="text-ink-soft mt-0.5 text-sm">{row.headline}</p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {row.niche ? (
                      <span className="chip">
                        <span aria-hidden>{row.niche.emoji}</span>
                        {row.niche.name}
                      </span>
                    ) : (
                      <span className="chip text-crimson border-crimson">No niche set</span>
                    )}

                    <a
                      href={row.linkedin_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn btn-indigo btn-sm"
                    >
                      Open LinkedIn ↗
                    </a>
                  </div>

                  {row.bio ? (
                    <p className="prose-post text-ink-soft mt-3 text-sm">{row.bio}</p>
                  ) : null}

                  {row.review_note ? (
                    <p className="border-line text-ink-soft mt-3 border-l-2 pl-3 text-sm italic">
                      {row.review_note}
                    </p>
                  ) : null}

                  {active === "pending" ? (
                    <ReviewActions profileId={row.id} willBeFounding={foundingSlotsLeft > 0} />
                  ) : active === "verified" ? (
                    <Link
                      href={`/space/${row.id}`}
                      className="link-ink mt-3 inline-block text-sm font-semibold"
                    >
                      View their space
                    </Link>
                  ) : (
                    <p className="text-ink-faint mt-3 text-xs">
                      Rejected {row.reviewed_at ? timeAgo(row.reviewed_at) : ""}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink-faint mt-10 text-xs leading-relaxed">
        Approving sets verification_status to verified, creates the professional&rsquo;s space, and
        — while founding slots remain — marks them a founding member. All of it happens inside a
        SECURITY DEFINER function that re-checks your admin role in the database.
      </p>
    </div>
  );
}
