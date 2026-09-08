import type { Metadata } from "next";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = { title: "Your details" };

/**
 * The one profile editor.
 *
 * "Edit my profile" on your own profile and the "fill your details" prompt
 * both land here — there is deliberately no second place to type any of this.
 *
 * MOCK PASS: identity comes from the client-side mock auth context, so the
 * page itself is a thin server shell and the logged-out state is handled
 * inside. Writes go through lib/api and last as long as the tab does.
 */
export default function SettingsPage() {
  return <SettingsView />;
}
