import Link from "next/link";
import { HimalayaRidge, Pennant } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="relative mt-24">
      <HimalayaRidge className="absolute inset-x-0 bottom-full h-24 w-full sm:h-32" />

      <div className="border-line bg-paper-deep/60 border-t">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                <Pennant className="h-7 w-auto" />
                <span className="font-display text-lg font-semibold">Sathi</span>
              </div>
              <p className="text-ink-soft mt-3 text-sm leading-relaxed">
                Built in Nepal, for people who are trying to figure out the next step. Every
                professional here was checked by a person before they got a page.
              </p>
            </div>

            {/* Explore only. Signing up and logging in are the header's job on
                every page, and repeating them down here was a second set of
                calls to action competing with the first. */}
            <div className="text-sm">
              <FooterColumn title="Explore">
                <FooterLink href="/feed?niche=tech">Tech</FooterLink>
                <FooterLink href="/#how-it-works">How it works</FooterLink>
              </FooterColumn>
            </div>
          </div>

          <div className="border-line text-ink-faint mt-8 flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Sathi. Kathmandu.</p>
            <p className="font-deva">नेपालमै बनेको</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-ink-soft mb-2 text-[0.7rem] font-bold tracking-[0.14em] uppercase">
        {title}
      </p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-crimson font-medium transition-colors">
        {children}
      </Link>
    </li>
  );
}
