const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Short relative time — "4h", "3d", then a date. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diff = Date.now() - then;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;

  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/** Trim to a word boundary for feed previews. */
export function excerpt(text: string, maxLength = 340): { text: string; truncated: boolean } {
  const clean = text.trim();
  if (clean.length <= maxLength) return { text: clean, truncated: false };

  const slice = clean.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  return { text: `${slice.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`, truncated: true };
}
