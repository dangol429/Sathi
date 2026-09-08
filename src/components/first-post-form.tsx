"use client";

import { useActionState, useState } from "react";
import { createFirstPost, type ActionState } from "@/app/actions/professional";
import { FormError } from "@/components/auth-forms";

/**
 * The first-post prompt. Deliberately one template, not a menu — the whole
 * point is to get a real answer out of someone in five minutes.
 */
const TEMPLATE = `I'm [name], and I [what you do] at [where] — [how many] years in.

I got here by [the honest version, not the CV version].

One piece of advice I wish someone had given me: `;

export function FirstPostForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createFirstPost, {});
  const [content, setContent] = useState("");

  const tooShort = content.trim().length < 20;

  return (
    <form action={formAction}>
      <div className="card-soft border-marigold/50 bg-marigold-wash/60 mb-5 p-5">
        <p className="text-turmeric text-[0.7rem] font-bold tracking-[0.14em] uppercase">
          The prompt
        </p>
        <p className="font-display mt-2 text-xl leading-snug">
          Introduce yourself, and share one piece of advice you wish you&rsquo;d gotten.
        </p>
        <p className="text-ink-soft mt-2 text-sm leading-relaxed">
          The advice is the part people remember. Make it specific enough to be arguable — &ldquo;work
          hard&rdquo; helps nobody.
        </p>
      </div>

      <label className="field-label" htmlFor="content">
        Your first post
      </label>
      <textarea
        id="content"
        name="content"
        required
        rows={12}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="field resize-y leading-relaxed"
        placeholder={`Hi, I'm ${displayName.split(/\s+/)[0] || "…"}. Start anywhere — you can always edit later.`}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || tooShort} className="btn btn-primary">
          {pending ? "Publishing…" : "Publish and open my space"}
        </button>

        {content.length === 0 ? (
          <button
            type="button"
            onClick={() => setContent(TEMPLATE)}
            className="btn btn-paper btn-sm"
          >
            Start from the template
          </button>
        ) : null}

        <span className="text-ink-faint ml-auto text-xs font-medium">
          {content.trim().length} characters
        </span>
      </div>

      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}
