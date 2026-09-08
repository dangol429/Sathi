import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";

export const metadata: Metadata = { title: "Your profile" };

/**
 * The logged-in user's own profile.
 *
 * MOCK PASS: identity comes from the client-side mock auth context, so the
 * page itself is a thin server shell. A reload signs you out and this shows
 * the logged-out state — expected until real sessions land.
 */
export default function ProfilePage() {
  return <ProfileView />;
}
