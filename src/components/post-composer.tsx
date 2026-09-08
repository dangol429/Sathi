"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPost, type ActionState } from "@/app/actions/professional";
import { FormError } from "@/components/auth-forms";

export function PostComposer({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createPost, {});
  const [content, setContent] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setContent("");
      formRef.current?.reset();
    }
  }, [state.ok]);

  const firstName = displayName.split(/\s+/)[0] || "there";

  return (
    <form ref={formRef} action={formAction} className="card p-4 sm:p-5">
      <label className="field-label" htmlFor="composer">
        Post to your space
      </label>
      <textarea
        id="composer"
        name="content"
        rows={content.length > 0 ? 6 : 3}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="field resize-y leading-relaxed"
        placeholder={`What do people keep getting wrong about your job, ${firstName}?`}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || content.trim().length < 20}
          className="btn btn-primary btn-sm"
        >
          {pending ? "Posting…" : "Post"}
        </button>
        <span className="text-ink-faint text-xs">
          {content.trim().length < 20
            ? `${20 - content.trim().length} more characters`
            : `${content.trim().length} characters`}
        </span>
      </div>

      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}
