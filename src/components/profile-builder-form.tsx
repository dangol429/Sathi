"use client";

import { useActionState, useState } from "react";
import { saveProfessionalProfile, type ActionState } from "@/app/actions/professional";
import { FormError } from "@/components/auth-forms";
import type { NicheRow, ProfileLink } from "@/lib/database.types";

const MAX_LINKS = 4;

export function ProfileBuilderForm({
  niches,
  defaults,
}: {
  niches: NicheRow[];
  defaults: {
    displayName: string;
    headline: string;
    bio: string;
    nicheId: string | null;
    links: ProfileLink[];
  };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveProfessionalProfile,
    {},
  );
  const [links, setLinks] = useState<ProfileLink[]>(
    defaults.links.length > 0 ? defaults.links : [{ label: "", url: "" }],
  );
  const [bio, setBio] = useState(defaults.bio);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="display_name">
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            defaultValue={defaults.displayName}
            className="field"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="headline">
            Role and where
          </label>
          <input
            id="headline"
            name="headline"
            maxLength={120}
            defaultValue={defaults.headline}
            className="field"
            placeholder="Senior Backend Engineer · Kathmandu"
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="bio">
          Your bio
        </label>
        <textarea
          id="bio"
          name="bio"
          required
          rows={7}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          className="field resize-y"
          placeholder="How you got here, what you actually do day to day, and what you are happy to be asked about. Plain language beats a CV."
        />
        <div className="mt-1.5 flex justify-between text-xs">
          <span className="text-ink-faint">
            The students reading this are trying to work out if your path is available to them.
          </span>
          <span className={bio.trim().length < 40 ? "text-crimson font-semibold" : "text-ink-faint"}>
            {bio.trim().length} / 40 min
          </span>
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Your niche</legend>
        <div className="flex flex-wrap gap-2">
          {niches.map((niche) => (
            <label
              key={niche.id}
              className="border-line hover:border-line has-checked:border-crimson has-checked:bg-crimson-wash flex cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors"
            >
              <input
                type="radio"
                name="niche_id"
                value={niche.id}
                defaultChecked={defaults.nicheId ? defaults.nicheId === niche.id : true}
                className="accent-crimson"
              />
              <span aria-hidden>{niche.emoji}</span>
              {niche.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Links people can follow</legend>
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex flex-wrap gap-2">
              <input
                name="link_label"
                value={link.label}
                onChange={(event) =>
                  setLinks((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, label: event.target.value } : item,
                    ),
                  )
                }
                className="field w-full sm:w-40"
                placeholder="GitHub"
                aria-label={`Link ${index + 1} label`}
              />
              <input
                name="link_url"
                value={link.url}
                onChange={(event) =>
                  setLinks((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, url: event.target.value } : item,
                    ),
                  )
                }
                className="field min-w-0 flex-1"
                placeholder="github.com/you"
                inputMode="url"
                aria-label={`Link ${index + 1} URL`}
              />
              {links.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setLinks((current) => current.filter((_, i) => i !== index))}
                  className="btn btn-ghost btn-sm"
                  aria-label={`Remove link ${index + 1}`}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {links.length < MAX_LINKS ? (
          <button
            type="button"
            onClick={() => setLinks((current) => [...current, { label: "", url: "" }])}
            className="btn btn-paper btn-sm mt-2"
          >
            + Add another link
          </button>
        ) : null}
      </fieldset>

      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : "Save and write my first post"}
      </button>

      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}
