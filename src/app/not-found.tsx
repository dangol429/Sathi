import Link from "next/link";
import { Pennant } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <Pennant className="mx-auto h-20 w-auto -rotate-6" />
      <h1 className="mt-8 text-4xl">This page isn&rsquo;t here.</h1>
      <p className="text-ink-soft mt-3 leading-relaxed">
        Either the link is wrong, or the professional you were looking for has not been verified
        yet. Pending profiles do not have public pages.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Back to the start
        </Link>
        <Link href="/feed?niche=tech" className="btn btn-paper">
          Browse tech
        </Link>
      </div>
    </div>
  );
}
