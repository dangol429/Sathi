"use client";

import { useActionState, useState } from "react";
import { approveProfessional, rejectProfessional } from "@/app/actions/admin";
import { FormError } from "@/components/auth-forms";
import type { ActionState } from "@/app/actions/professional";

export function ReviewActions({
  profileId,
  willBeFounding,
}: {
  profileId: string;
  willBeFounding: boolean;
}) {
  const [showReject, setShowReject] = useState(false);
  const [approveState, approveAction, approving] = useActionState<ActionState, FormData>(
    approveProfessional,
    {},
  );
  const [rejectState, rejectAction, rejecting] = useActionState<ActionState, FormData>(
    rejectProfessional,
    {},
  );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <form action={approveAction}>
          <input type="hidden" name="profile_id" value={profileId} />
          <button type="submit" disabled={approving || rejecting} className="btn btn-primary btn-sm">
            {approving ? "Approving…" : "Approve"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowReject((value) => !value)}
          disabled={approving}
          className="btn btn-paper btn-sm"
        >
          {showReject ? "Cancel" : "Reject"}
        </button>

        {willBeFounding ? (
          <span className="stamp stamp-founding">Will be founding</span>
        ) : null}
      </div>

      {showReject ? (
        <form action={rejectAction} className="mt-3">
          <input type="hidden" name="profile_id" value={profileId} />
          <label className="field-label" htmlFor={`note-${profileId}`}>
            Reason (shown to them)
          </label>
          <textarea
            id={`note-${profileId}`}
            name="note"
            rows={2}
            className="field resize-y"
            placeholder="Profile is private, so we could not confirm the role."
          />
          <button
            type="submit"
            disabled={rejecting}
            className="btn btn-indigo btn-sm mt-2"
          >
            {rejecting ? "Rejecting…" : "Confirm rejection"}
          </button>
        </form>
      ) : null}

      {approveState.error ? <FormError message={approveState.error} /> : null}
      {rejectState.error ? <FormError message={rejectState.error} /> : null}
    </div>
  );
}
