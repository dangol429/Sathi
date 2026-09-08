import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell, AuthSwitchNote } from "@/components/auth-shell";
import { EmailAuthForm, FormError, GoogleButton, OrDivider } from "@/components/auth-forms";
import { getViewer, landingRouteFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const viewer = await getViewer();

  if (viewer) redirect(next?.startsWith("/") ? next : landingRouteFor(viewer));

  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <AuthShell
      accent="indigo"
      eyebrow="Welcome back"
      title="Pick up where you left off."
      intro="One account, whether you are here to ask or to answer."
      footer={
        <AuthSwitchNote question="New here?" href="/signup" linkLabel="Create an account" />
      }
    >
      <h2 className="text-2xl">Log in</h2>
      <p className="text-ink-soft mt-1 mb-5 text-sm">Use whichever method you signed up with.</p>

      {error ? <FormError message={error} /> : null}

      <GoogleButton next={target} label="Continue with Google" />
      <OrDivider />
      <EmailAuthForm mode="login" next={target} submitLabel="Log in" />
    </AuthShell>
  );
}
