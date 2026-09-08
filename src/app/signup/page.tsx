import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell, AuthSwitchNote, Checklist } from "@/components/auth-shell";
import { EmailAuthForm, GoogleButton, OrDivider } from "@/components/auth-forms";
import { getViewer, landingRouteFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Join Sathi" };

/** One door for everyone. The three questions come after the account exists. */
const NEXT = "/onboarding";

export default async function SignupPage() {
  const viewer = await getViewer();
  if (viewer) redirect(landingRouteFor(viewer));

  return (
    <AuthShell
      eyebrow="Join Sathi"
      title="One way in, whoever you are."
      intro="Sign up once. Ask what you need to know, answer what you're good at, or both."
      aside={
        <Checklist
          items={[
            "Ask questions and get answers from people who do the work",
            "Answer them yourself when you know something worth passing on",
            "Follow the people whose job you want, and see what they post",
            "Add your LinkedIn whenever you like to get a Verified badge",
          ]}
        />
      }
      footer={
        <AuthSwitchNote
          question="Already have an account?"
          href={`/login?next=${encodeURIComponent(NEXT)}`}
          linkLabel="Log in"
        />
      }
    >
      <h2 className="text-2xl">Create your account</h2>
      <p className="text-ink-soft mt-1 mb-5 text-sm">
        Takes about thirty seconds. Three short questions after that.
      </p>

      <GoogleButton next={NEXT} label="Continue with Google" />
      <OrDivider />
      <EmailAuthForm mode="signup" next={NEXT} submitLabel="Sign up with email" />

      <p className="text-ink-faint mt-5 text-xs leading-relaxed">
        By signing up you agree to be decent to people who are trying to learn. That is genuinely
        most of the rules.
      </p>
    </AuthShell>
  );
}
