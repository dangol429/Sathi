"use client";

import { useEffect, useRef } from "react";
import { Avatar } from "@/components/avatar";
import { Pennant } from "@/components/brand";
import { useImageCrop } from "@/components/image-crop";

/* ===========================================================================
 * The two pictures on a profile: the cover band and the face.
 *
 * Same mock-phase pattern as the composer's image attach — a local file
 * picker, a crop step, an object URL, and no upload. The picture therefore
 * lasts exactly as long as the tab, because there is nowhere to put the bytes
 * until Supabase Storage exists. Both controls only appear on your own
 * profile, on the same `isOwn` test that decides whether "Edit my profile"
 * is there.
 *
 * Neither picture is ever applied straight from the file. A cover is a 3:1
 * band and a profile picture is a circle, and dropping an arbitrary photo into
 * either without letting somebody frame it is how you get a banner that is
 * mostly somebody's forehead.
 *
 * Nothing here pretends to be persistence: the label says so, and the URL is
 * revoked when it is replaced so a session's worth of picking files does not
 * quietly retain every one of them.
 * ========================================================================= */

/** Revokes the previous object URL whenever this one replaces it. */
function useRevokeOnChange(url: string | undefined) {
  const previous = useRef<string | undefined>(undefined);

  useEffect(() => {
    const stale = previous.current;
    previous.current = url;
    if (stale && stale !== url && stale.startsWith("blob:")) URL.revokeObjectURL(stale);
  }, [url]);
}

export function ProfileCover({
  url,
  isOwn,
  onChange,
}: {
  url?: string;
  isOwn: boolean;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  useRevokeOnChange(url);
  const { pick, cropper } = useImageCrop({
    aspect: 3,
    title: "Crop your cover",
    hint: "Covers are a wide band. Drag the frame to choose which strip of the picture shows.",
    onCropped: onChange,
  });

  return (
    <div className="border-line relative h-36 overflow-hidden border-b sm:h-44">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          {/* The woven-lattice band everybody starts with. */}
          <div className="lattice absolute inset-0" />
          <div className="bg-paper/40 absolute inset-0" aria-hidden />
          <Pennant className="absolute right-6 bottom-4 h-16 w-auto opacity-70 sm:right-10 sm:h-24" />
        </>
      )}

      {isOwn ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              pick(event.target.files?.[0]);
              // Let the same file be picked again after a cancelled crop.
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn btn-paper btn-sm absolute top-3 right-4 sm:right-6"
          >
            <CameraGlyph />
            {url ? "Change cover" : "Add a cover"}
          </button>
          {cropper}
        </>
      ) : null}
    </div>
  );
}

export function ProfileAvatar({
  name,
  url,
  isOwn,
  onChange,
}: {
  name: string;
  url?: string;
  isOwn: boolean;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  useRevokeOnChange(url);
  const { pick, cropper } = useImageCrop({
    aspect: 1,
    title: "Crop your profile picture",
    hint: "Profile pictures are square and shown as a circle. Frame your face in the middle.",
    onCropped: onChange,
  });

  if (!isOwn) return <Avatar name={name} src={url} size={76} />;

  return (
    <div className="relative w-fit">
      <Avatar name={name} src={url} size={76} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={url ? "Change your profile picture" : "Add a profile picture"}
        title={url ? "Change your profile picture" : "Add a profile picture"}
        className="border-line bg-snow text-ink-soft hover:bg-elevated hover:text-ink absolute -right-1 -bottom-1 rounded-full border-2 p-1.5 transition-colors"
      >
        <CameraGlyph />
      </button>
      {cropper}
    </div>
  );
}

function CameraGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.1-2h8.4l1.1 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
