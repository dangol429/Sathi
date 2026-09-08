import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Garland, Pennant } from "@/components/brand";
import { requireViewer } from "@/lib/auth";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Under review" };
export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const viewer = await requireViewer("/pending");
  const profile = viewer.profile;

  if (!profile) redirect("/onboarding");
  if (profile.verification_status === "verified") {
    redirect(profile.bio ? `/space/${profile.id}` : "/onboarding/professional");
  }

  const rejected = profile.verification_status === "rejected";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="card overflow-hidden p-0">
        <div className={`${rejected ? "bg-selected" : "lattice"} relative px-7 py-8 sm:px-9`}>
          <div className="relative flex items-start gap-4">
            <Pennant className="h-14 w-auto shrink-0" />
            <div>
              <p
                className={`text-[0.7rem] font-bold tracking-[0.16em] uppercase ${
                  rejected ? "text-on-selected" : "text-crimson"
                }`}
              >
                {rejected ? "Not approved" : "Application received"}
              </p>
              <h1 className={`mt-1.5 text-3xl sm:text-4xl ${rejected ? "text-on-accent" : ""}`}>
                {rejected ? "We could not verify this one." : "A person is reading your profile."}
              </h1>
            </div>
          </div>
        </div>

        <Garland />

        <div className="p-7 sm:p-9">
          {rejected ? (
            <>
              <p className="text-ink-soft leading-relaxed">
                Someone looked at your LinkedIn and could not confirm that you are currently working
                in this field. That is usually one of three things: the profile is private, it is
                very sparse, or the work does not line up with the niche you picked.
              </p>

              {profile.review_note ? (
                <div className="card-soft border-crimson/30 bg-crimson-wash/50 mt-5 p-4">
                  <p className="text-crimson-deep text-[0.7rem] font-bold tracking-[0.14em] uppercase">
                    Note from the reviewer
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed">{profile.review_note}</p>
                </div>
              ) : null}

              <p className="text-ink-soft mt-5 text-sm leading-relaxed">
                If you think this was a mistake — and it might be, one person made this call — reply
                to us and we will look again.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href="mailto:hello@sathi.example?subject=Verification%20review" className="btn btn-primary">
                  Ask us to look again
                </a>
                <Link href="/feed?niche=tech" className="btn btn-paper">
                  Browse in the meantime
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-ink-soft text-lg leading-relaxed">
                Nothing is automated here. Someone on our side will open the LinkedIn URL you gave
                us, check that you actually do this work, and make a call. That usually takes{" "}
                <strong className="text-ink font-semibold">a day or two</strong>, sometimes longer
                if a lot of people applied that week.
              </p>

              <ol className="mt-8 space-y-0">
                <TimelineStep state="done" title="You applied" detail={`Submitted ${timeAgo(profile.created_at)}`} />
                <TimelineStep
                  state="current"
                  title="A human reviews your LinkedIn"
                  detail="No bots, no scraping, no automated checks. Just someone reading."
                />
                <TimelineStep
                  state="todo"
                  title="You build your profile"
                  detail="Bio, links, and the niche you want to be found in."
                />
                <TimelineStep
                  state="todo"
                  title="You write your first post"
                  detail="We give you a prompt. It takes five minutes."
                  last
                />
              </ol>

              <div className="card-soft mt-8 p-5">
                <p className="eyebrow">What you submitted</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <Row label="Name" value={profile.display_name} />
                  {profile.headline ? <Row label="Role" value={profile.headline} /> : null}
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <dt className="text-ink-faint w-20 shrink-0 font-semibold">LinkedIn</dt>
                    <dd className="min-w-0 flex-1">
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="link-ink break-all"
                      >
                        {profile.linkedin_url}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="text-ink-faint mt-6 text-sm">
                You can close this tab. Come back and log in any time to check — this page updates
                the moment a decision is made.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/feed?niche=tech" className="btn btn-paper">
                  Read the space while you wait
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      <dt className="text-ink-faint w-20 shrink-0 font-semibold">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium">{value}</dd>
    </div>
  );
}

function TimelineStep({
  state,
  title,
  detail,
  last = false,
}: {
  state: "done" | "current" | "todo";
  title: string;
  detail: string;
  last?: boolean;
}) {
  const dot =
    state === "done"
      ? "bg-jade border-jade"
      : state === "current"
        ? "bg-marigold border-turmeric"
        : "bg-paper-deep border-line";

  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${dot}`} aria-hidden />
        {!last ? <span className="bg-ink/15 w-0.5 flex-1" aria-hidden /> : null}
      </div>
      <div className={last ? "pb-0" : "pb-6"}>
        <p className={`font-semibold ${state === "todo" ? "text-ink-faint" : ""}`}>
          {title}
          {state === "current" ? (
            <span className="stamp stamp-pending ml-2 align-middle">In progress</span>
          ) : null}
        </p>
        <p className="text-ink-soft mt-0.5 text-sm leading-relaxed">{detail}</p>
      </div>
    </li>
  );
}
