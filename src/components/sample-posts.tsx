import { Avatar } from "@/components/avatar";

/**
 * Fallback content for an empty database, so the landing page has something in
 * it before the first professional is approved.
 *
 * These are labelled as examples wherever they render — they are not real
 * accounts and must never be presented as if they were.
 */
export type Sample = {
  name: string;
  headline: string;
  content: string;
};

export const SAMPLE_POSTS: Sample[] = [
  {
    name: "A backend engineer",
    headline: "8 years, payments · Kathmandu",
    content:
      "Your first job here will probably not be at a company you have heard of, and that is fine. What matters is whether one person there reviews your code seriously. I stayed two years somewhere with a bad salary because a senior tore apart every pull request I opened.",
  },
  {
    name: "A product designer",
    headline: "Fintech · came in from civil engineering",
    content:
      "Nobody was going to hand a civil engineering graduate a design job, so for a year I redesigned real Nepali apps and wrote up why I changed what I changed. That folder of unpaid work is the only reason I got an interview. The write-up mattered more than the pixels.",
  },
  {
    name: "A data scientist",
    headline: "Dharan → Berlin",
    content:
      "You do not need a referral, you need a reason for someone to reply. I sent about 200 cold applications from Nepal and got nothing. What worked was writing publicly about a messy dataset for three months. The company that hired me found the posts.",
  },
  {
    name: "A founding engineer",
    headline: "Two startups, one that worked",
    content:
      "Eleven tutorial projects on a CV tell me nothing. One thing that is actually running somewhere, that a stranger has used, tells me you have had a server die at 2am. That is the whole difference.",
  },
];

export function SamplePostCard({ sample }: { sample: Sample }) {
  return (
    <article className="card-soft relative p-5">
      <span className="border-line text-ink-faint bg-paper-deep absolute -top-2.5 right-4 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.14em] uppercase">
        Example
      </span>

      <header className="mb-3 flex items-center gap-3">
        <Avatar name={sample.name} size={42} />
        <div className="min-w-0">
          <p className="font-display text-[1.05rem] leading-tight font-semibold">{sample.name}</p>
          <p className="text-ink-soft truncate text-sm">{sample.headline}</p>
        </div>
      </header>

      <p className="prose-post text-ink-soft text-[0.95rem]">{sample.content}</p>
    </article>
  );
}
