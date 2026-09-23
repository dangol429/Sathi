/* ---------------------------------------------------------------------------
 * The fifteen-minute EDIT window.
 *
 * Shared by post editing and message editing: long enough to fix a typo or
 * think better of the wording, short enough that whatever somebody has already
 * answered — a post, a reply in Kura — cannot be rewritten underneath them
 * afterwards. One constant rather than two copies, so the two surfaces cannot
 * quietly drift to different windows.
 *
 * Deleting is NOT gated on this and never was meant to be. Editing and
 * deleting look like the same permission but are not: an edit can change what
 * you appear to have said with nobody the wiser, which is why it expires,
 * while a deletion is plainly a deletion. Telling someone their own words are
 * stuck on the site because they thought better of them sixteen minutes too
 * late is the wrong answer, so nothing here is consulted for Delete.
 *
 * Checked in the browser against a client-side timestamp, which is a
 * mock-phase shortcut: the real check is one comparison in an RLS policy once
 * posts and messages carry a server timestamp. Nothing here should be
 * mistaken for enforcement.
 * ------------------------------------------------------------------------- */

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * How long is left to edit something, given when it was created.
 *
 * `createdAt` is only set on things written in this session — every seeded
 * fixture deliberately has none, so its window reads as already closed rather
 * than as newly opened.
 */
export function editWindowRemaining(createdAt: number | undefined, now: number): number {
  if (!createdAt) return 0;
  return Math.max(0, createdAt + EDIT_WINDOW_MS - now);
}
