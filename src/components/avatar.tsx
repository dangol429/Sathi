/**
 * Initial-based avatar. Falls back to a deterministic festival colour so a
 * feed of people without photos still has some life in it.
 */
const PALETTE = [
  "var(--color-crimson)",
  "var(--color-indigo)",
  "var(--color-turmeric)",
  "var(--color-jade)",
  "var(--color-indigo-soft)",
  "var(--color-crimson-deep)",
];

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function Avatar({
  name,
  src,
  size = 40,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  const background = PALETTE[hashCode(name) % PALETTE.length];

  if (src) {
    return (
      /* Avatars come from arbitrary OAuth hosts; configuring next/image
         remote patterns for all of them is not worth it at this size. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="border-line shrink-0 rounded-full border-2 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="border-line text-on-accent inline-flex shrink-0 items-center justify-center rounded-full border-2 font-bold"
      style={{
        width: size,
        height: size,
        background,
        fontSize: Math.max(11, size * 0.38),
      }}
    >
      {initials}
    </span>
  );
}
