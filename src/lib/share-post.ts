/**
 * Sharing a post: the native sheet where there is one — that is what people
 * expect on a phone — and the clipboard everywhere else.
 *
 * Pulled out of the component because the caller should not have to remember
 * the fallback chain, and because the link shape (`/feed#<id>`) is the kind of
 * detail that quietly grows a second, different copy the moment two places
 * need it.
 *
 * Returns what actually happened so the caller can say so. A dismissed native
 * sheet is not a failure and falls through to the clipboard: on a phone,
 * cancelling the share sheet and then finding the link on your clipboard is a
 * better outcome than nothing at all.
 */
export type ShareOutcome = "shared" | "copied" | "failed";

export async function sharePostLink(postId: string): Promise<ShareOutcome> {
  const url = `${window.location.origin}/feed#${postId}`;

  if (navigator.share) {
    try {
      await navigator.share({ url, title: "A post on Sathi" });
      return "shared";
    } catch {
      // Dismissed, or not permitted. Fall through to the clipboard.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
