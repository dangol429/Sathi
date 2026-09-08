"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Pennant } from "@/components/brand";
import { ProfileDetailSection } from "@/components/detail-editor";
import { useMockAuth } from "@/components/mock-auth";
import { useToast } from "@/components/toast";
import { updateProfile } from "@/lib/api";

/* ===========================================================================
 * Settings — the one place a profile is edited.
 *
 * Both prompts point here: "Edit my profile" on your own page, and the "fill
 * your details" card that appears when the four sections are empty. There is
 * no second editor anywhere, and the detail sections are literally the same
 * components onboarding step 3 renders, so the two cannot drift.
 *
 * The detail sections save as you go — adding a job and then losing it to a
 * missed Save button is the worst possible outcome for a form nobody wanted to
 * fill in. The basic fields have an explicit Save, because a half-typed name
 * should not be written on every keystroke.
 * ========================================================================= */

export function SettingsView() {
  const { user, logIn } = useMockAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <Pennant className="mx-auto h-16 w-auto -rotate-6" />
        <h1 className="mt-6 text-3xl">You&rsquo;re not logged in.</h1>
        <p className="text-ink-soft mt-3 leading-relaxed">
          Settings are yours, so there has to be a you. Log in and this fills in.
        </p>
        <button type="button" onClick={logIn} className="btn btn-primary mt-6">
          Log in
        </button>
      </div>
    );
  }

  return <SettingsBody />;
}

function SettingsBody() {
  const { user, updateUser } = useMockAuth();
  const { toast } = useToast();

  // Narrowed by the caller; this component is never rendered logged out.
  const id = user!.slug;

  const [name, setName] = useState(user!.name);
  const [tagline, setTagline] = useState(user!.tagline ?? "");
  const [role, setRole] = useState(user!.role);
  const [city, setCity] = useState(user!.city);
  const [linkedin, setLinkedin] = useState(user!.linkedinUrl ?? "");
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveBasics(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) return;

    const url = linkedin.trim();
    if (url && !url.toLowerCase().includes("linkedin.com")) {
      setLinkedinError("That should look like linkedin.com/in/your-name.");
      return;
    }
    setLinkedinError(null);
    setSaving(true);

    const patch = {
      name: name.trim(),
      tagline: tagline.trim(),
      role: role.trim(),
      city: city.trim(),
      linkedinUrl: url,
    };
    await updateProfile(id, patch);
    // Keep the header and the profile page in step without a reload.
    updateUser(patch);

    setSaving(false);
    toast("Saved");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={user!.name} size={48} />
          <div>
            <h1 className="text-3xl leading-tight sm:text-4xl">Your details</h1>
            <p className="text-ink-soft mt-1 text-sm">
              Everything here is optional except your name.
            </p>
          </div>
        </div>
        <Link href="/profile" className="btn btn-paper btn-sm">
          View profile
        </Link>
      </div>

      {/* --- Basics ------------------------------------------------------ */}
      <form onSubmit={saveBasics} className="card mt-8 p-5 sm:p-6">
        <h2 className="eyebrow">Basic information</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="settings-name">
              Display name
            </label>
            <input
              id="settings-name"
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="Sujata Maharjan"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="settings-role">
              What you do
              <span className="text-ink-faint ml-1.5 font-medium normal-case">optional</span>
            </label>
            <input
              id="settings-role"
              className="field"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Backend Engineer"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="settings-city">
              Where you are
              <span className="text-ink-faint ml-1.5 font-medium normal-case">optional</span>
            </label>
            <input
              id="settings-city"
              className="field"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Kathmandu"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="settings-tagline">
              One line about you
              <span className="text-ink-faint ml-1.5 font-medium normal-case">optional</span>
            </label>
            <input
              id="settings-tagline"
              className="field"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              placeholder="QA tester in 2016, no CS degree. Now leading a platform team."
            />
            <p className="text-ink-faint mt-1.5 text-xs">
              Shown under your name on your profile. One sentence is the format.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="settings-linkedin">
              LinkedIn
              <span className="text-ink-faint ml-1.5 font-medium normal-case">optional</span>
            </label>
            <input
              id="settings-linkedin"
              className="field"
              value={linkedin}
              onChange={(event) => setLinkedin(event.target.value)}
              placeholder="linkedin.com/in/your-name"
              inputMode="url"
            />
            {linkedinError ? (
              <p className="text-crimson mt-1.5 text-xs font-semibold">{linkedinError}</p>
            ) : (
              <p className="text-ink-faint mt-1.5 text-xs">
                This is what a human reads when deciding whether to verify you.
              </p>
            )}
          </div>
        </div>

        <div className="border-line mt-6 flex items-center gap-3 border-t pt-5">
          <button
            type="submit"
            disabled={saving || name.trim().length < 2}
            className="btn btn-primary btn-sm"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <p className="text-ink-faint text-xs">The sections below save as you edit them.</p>
        </div>
      </form>

      {/* --- The four sections, same components onboarding uses ---------- */}
      <div className="mt-5 space-y-5">
        <ProfileDetailSection kind="education" profileId={id} />
        <ProfileDetailSection kind="experience" profileId={id} />
        <ProfileDetailSection kind="projects" profileId={id} />
        <ProfileDetailSection kind="certifications" profileId={id} />
      </div>
    </div>
  );
}
