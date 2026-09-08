"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addComment } from "@/app/actions/social";
import { FormError } from "@/components/auth-forms";
import type { ActionState } from "@/app/actions/professional";

export function CommentForm({ postId }: { postId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addComment, {});
  const [content, setContent] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setContent("");
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="post_id" value={postId} />
      <label className="field-label" htmlFor="comment">
        Add to the thread
      </label>
      <textarea
        id="comment"
        name="content"
        rows={3}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="field resize-y"
        placeholder="Ask the follow-up question you actually want answered."
      />
      <button
        type="submit"
        disabled={pending || content.trim().length < 2}
        className="btn btn-primary btn-sm mt-3"
      >
        {pending ? "Posting…" : "Post reply"}
      </button>

      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}
