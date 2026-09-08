import Link from "next/link";
import { Pennant } from "@/components/brand";

/**
 * Two-column shell for every auth screen: context on the left so people know
 * which door they walked through, the form on the right.
 */
export function AuthShell({
  eyebrow,
  title,
  intro,
  aside,
  accent = "crimson",
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  aside?: React.ReactNode;
  accent?: "crimson" | "indigo";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const accentBg = accent === "indigo" ? "bg-indigo" : "bg-crimson";

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1fr] lg:gap-14 lg:py-16">
      <div className="lg:pt-4">
        <p className="eyebrow flex items-center gap-2">
          <Pennant className="h-4 w-auto" showEmblems={false} />
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl leading-tight sm:text-[2.75rem]">{title}</h1>
        <p className="text-ink-soft mt-4 text-lg leading-relaxed">{intro}</p>

        {aside ? <div className="mt-8">{aside}</div> : null}

        <div className={`${accentBg} mt-8 h-1.5 w-24 rounded-full`} aria-hidden />
      </div>

      <div>
        <div className="card p-6 sm:p-7">{children}</div>
        {footer ? <div className="text-ink-soft mt-4 text-sm">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AuthSwitchNote({
  question,
  href,
  linkLabel,
}: {
  question: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <p>
      {question}{" "}
      <Link href={href} className="link-ink font-semibold">
        {linkLabel}
      </Link>
    </p>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="text-ink-soft flex gap-3 text-sm leading-relaxed">
          <TickGlyph />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TickGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="text-jade mt-0.5 h-4 w-4 shrink-0" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m6.5 10.2 2.4 2.4 4.6-5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
