import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonProfileView } from "@/components/profile-view";
import { getProfile } from "@/lib/api";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const person = await getProfile(id);
  return {
    title: person ? person.name : "Person",
    description: person ? `${person.role} · ${person.city}` : undefined,
  };
}

/**
 * Somebody else's profile. Same body as /profile, which is only ever your own.
 *
 * Lives under /profile so the two read as the same thing: /profile is yours,
 * /profile/[id] is somebody else's. Same layout, same component.
 *
 * MOCK PASS: the directory is the hardcoded list in feed-mock.ts, so an unknown
 * id is a genuinely broken link rather than someone who has not joined yet.
 */
export default async function PersonPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const person = await getProfile(id);
  if (!person) notFound();

  return <PersonProfileView person={person} />;
}
