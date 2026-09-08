const LINKEDIN_RE = /^https?:\/\/([a-z0-9-]+\.)?linkedin\.com\/.+/i;

/**
 * Accepts "linkedin.com/in/x" and "www.linkedin.com/in/x" as well as full
 * URLs. Returns null for anything that is not a LinkedIn profile link.
 *
 * Shape only — whether the person behind the link does the work they say they
 * do is a human's call, made from the review queue.
 */
export function normaliseLinkedIn(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return LINKEDIN_RE.test(withScheme) ? withScheme : null;
}
