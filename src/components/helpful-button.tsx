import { toggleHelpful } from "@/app/actions/social";

/**
 * The only reaction in v1. It marks a post as useful to *you* — there is no
 * ranking, no score on anyone's profile, and no downvote. Keep it that way
 * unless the product decision changes.
 */
export function HelpfulButton({
  postId,
  count,
  reacted,
  revalidatePath,
}: {
  postId: string;
  count: number;
  reacted: boolean;
  revalidatePath: string;
}) {
  return (
    <form action={toggleHelpful.bind(null, postId, revalidatePath)}>
      <button
        type="submit"
        aria-pressed={reacted}
        className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors ${
          reacted
            ? "border-turmeric bg-marigold-wash text-turmeric"
            : "border-line text-ink-soft hover:border-turmeric hover:text-turmeric"
        }`}
      >
        <LampGlyph filled={reacted} />
        {count > 0 ? count : ""} Helpful
      </button>
    </form>
  );
}

/** A diyo (oil lamp) rather than a thumbs-up — same gesture, better manners. */
function LampGlyph({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M12 3c.9 2.2.4 3.4-.5 4.5-.8 1-1.5 1.9-1.5 3.2a2 2 0 0 0 4 0c0-.7-.2-1.2-.4-1.7 1.6 1 2.4 2.6 2.4 4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 15h15c0 2.8-3.4 4.5-7.5 4.5S4.5 17.8 4.5 15Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
