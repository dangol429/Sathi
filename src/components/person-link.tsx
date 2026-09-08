"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { cachedDirectory, getDirectory } from "@/lib/api";
import { useAsync } from "@/lib/api/use-async";
import type { MockPerson } from "@/lib/feed-mock";

/* ---------------------------------------------------------------------------
 * A person's name or face, anywhere it appears.
 *
 * Both are links to their profile, and both say so on hover — the avatar takes
 * a ring, the name underlines. Before this, a name in a feed card looked
 * exactly like a name in a sentence, and the only way to find out it was
 * clickable was to click it.
 *
 * Somebody not in the directory renders as plain text rather than as a link
 * to a page that would 404. The directory is one shared fetch through
 * lib/api — see getDirectory — not a lookup into the fixture, so this keeps
 * working when the fixture is gone.
 * ------------------------------------------------------------------------- */

/** The slug for a display name, or null while the directory is still coming. */
function useSlug(name: string): string | null {
  const { data } = useAsync<MockPerson[]>(getDirectory, cachedDirectory());
  return data.find((person) => person.name === name)?.slug ?? null;
}

export function PersonName({
  name,
  className = "",
  children,
}: {
  name: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const slug = useSlug(name);
  const body = children ?? name;

  if (!slug) return <span className={className}>{body}</span>;

  return (
    <Link
      href={`/profile/${slug}`}
      className={`hover:text-crimson decoration-2 underline-offset-2 transition-colors hover:underline ${className}`}
    >
      {body}
    </Link>
  );
}

export function PersonAvatar({
  name,
  size = 40,
  src,
}: {
  name: string;
  size?: number;
  src?: string | null;
}) {
  const slug = useSlug(name);
  if (!slug) return <Avatar name={name} src={src} size={size} />;

  return (
    <Link
      href={`/profile/${slug}`}
      aria-label={`${name}'s profile`}
      className="hover:ring-crimson/40 shrink-0 rounded-full transition-shadow hover:ring-4"
    >
      <Avatar name={name} src={src} size={size} />
    </Link>
  );
}
