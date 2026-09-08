"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { useImageCrop } from "@/components/image-crop";
import { useMockAuth } from "@/components/mock-auth";
import { POST_TYPES, type RealPostType } from "@/lib/feed";
import { DEFAULT_NICHE, type MockPost } from "@/lib/feed-mock";

/* ===========================================================================
 * Writing a post.
 *
 * Collapsed by default: a single bar at the top of the feed, not a form
 * sitting permanently open above everything you came to read. It expands in
 * place when you click it, and if you are not signed in it asks you to log in
 * first rather than letting you type something it would have to throw away.
 *
 * MOCK: submitting adds to the feed's local state and nothing else. No fetch,
 * no server action, and it does not reach the profile page — that reads the
 * module's own array.
 *
 * An attached image goes through the crop step first — freeform here, since a
 * post picture is whatever shape suits it — and what comes back is an object
 * URL over a canvas. Nothing is uploaded, so it lasts exactly as long as the
 * tab: real attachments need somewhere to put the bytes, which is a Supabase
 * Storage pass, not this one.
 * ========================================================================= */

const TYPES = POST_TYPES.filter(
  (option): option is { value: RealPostType; label: string } => option.value !== "all",
);

export function PostComposer({
  onPost,
  placeholder,
}: {
  onPost: (post: MockPost) => void;
  /** The profile page asks a slightly different question than the feed. */
  placeholder?: string;
}) {
  const { user, requireAuth } = useMockAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RealPostType>("question");
  const [content, setContent] = useState("");
  const [pastedImage, setPastedImage] = useState(false);
  const [image, setImage] = useState<{ url: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Carried across the crop step, which hands back a canvas rather than a file.
  const nameRef = useRef<string>("");

  // An object URL holds the file in memory until it is handed back.
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );

  const { pick, cropper } = useImageCrop({
    aspect: null,
    title: "Crop your picture",
    hint: "Trim it to the part worth showing, or leave the frame where it is.",
    onCropped: attach,
  });

  function attach(url: string) {
    setImage((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { url, name: nameRef.current };
    });
    setPastedImage(false);
  }

  function removeImage() {
    setImage((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function collapse() {
    setOpen(false);
    setContent("");
    setType("question");
    setPastedImage(false);
    removeImage();
  }

  /*
   * Pasting text is the browser's job and this does not interfere with it.
   * Pasting a screenshot currently does nothing at all, which reads as broken,
   * so say so instead. Real attachments need somewhere to put the file —
   * Supabase Storage — which is a backend pass, not this one.
   */
  function onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const hasImage = Array.from(event.clipboardData?.items ?? []).some((item) =>
      item.type.startsWith("image/"),
    );
    if (hasImage) setPastedImage(true);
  }

  function submit() {
    const trimmed = content.trim();
    if (!user || trimmed.length === 0) return;

    onPost({
      id: `local-${Date.now()}`,
      type,
      author: user,
      niche: DEFAULT_NICHE.slug,
      postedAt: "just now",
      createdAt: Date.now(),
      content: trimmed,
      dhog: 0,
      comments: 0,
      imageUrl: image?.url,
    });

    // Hand the URL to the post rather than revoking it, or the picture would
    // be dead by the time the card rendered.
    setImage(null);
    if (fileRef.current) fileRef.current.value = "";
    setOpen(false);
    setContent("");
    setType("question");
    setPastedImage(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => requireAuth(() => setOpen(true))}
        className="border-line bg-snow hover:border-ink-faint flex w-full items-center gap-3 rounded-full border px-4 py-3 text-left transition-colors"
      >
        {user ? <Avatar name={user.name} size={30} /> : null}
        <span className="text-ink-faint text-sm">
          {placeholder ?? "Ask something, or share what you know…"}
        </span>
      </button>
    );
  }

  return (
    <section className="card p-4 sm:p-5" aria-label="Write a post">
      <div className="flex items-center gap-3">
        {user ? <Avatar name={user.name} size={34} /> : null}
        <p className="text-sm font-semibold">{user?.name}</p>
        <button
          type="button"
          onClick={collapse}
          className="btn btn-ghost btn-sm ml-auto"
          aria-label="Close composer"
        >
          <CloseGlyph />
        </button>
      </div>

      {/*
       * A statement, not a control. Tech is the only niche open, so asking
       * would be asking a question with one answer. The row is here, next to
       * the type selector, so that when a second niche opens this label
       * becomes the picker without anything around it moving.
       */}
      <p className="border-line-soft text-ink-soft mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm">
        <span className="text-ink-faint text-[0.7rem] font-bold tracking-[0.12em] uppercase">
          Posting in
        </span>
        <span className="text-ink inline-flex items-center gap-1 font-semibold">
          <span aria-hidden>{DEFAULT_NICHE.emoji}</span>
          {DEFAULT_NICHE.name}
        </span>
      </p>

      <fieldset className="mt-4">
        <legend className="field-label">What kind of post is this?</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              aria-pressed={type === option.value}
              className={`chip text-sm transition-colors ${
                type === option.value
                  ? "border-line bg-selected text-on-selected"
                  : "border-line hover:border-ink-faint text-ink-soft"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <textarea
        className="field mt-4 min-h-32 resize-y leading-relaxed"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={
          type === "question"
            ? "What do you want to know? The more specific, the better the answer."
            : "Say the thing you wish someone had told you."
        }
        aria-label="Your post"
        onPaste={onPaste}
        autoFocus
      />

      {pastedImage ? (
        <p className="text-ink-soft mt-2 text-xs" role="status">
          Pasting a picture doesn&rsquo;t work yet — use the image button below.
        </p>
      ) : null}

      {image ? (
        <figure className="border-line relative mt-3 overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="max-h-72 w-full object-cover" />
          <figcaption className="sr-only">{image.name}</figcaption>
          <button
            type="button"
            onClick={removeImage}
            aria-label="Remove image"
            className="bg-scrim text-on-accent absolute top-2 right-2 rounded-full p-1.5 backdrop-blur-sm"
          >
            <CloseGlyph />
          </button>
        </figure>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          nameRef.current = file?.name ?? "";
          pick(file);
          // Let the same file be picked again after a cancelled crop.
          event.target.value = "";
        }}
      />

      {cropper}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={image ? "Replace image" : "Add an image"}
          title={image ? "Replace image" : "Add an image"}
          className="hover:bg-elevated text-ink-soft hover:text-ink rounded-full p-2 transition-colors"
        >
          <ImageGlyph />
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={content.trim().length === 0}
          className="btn btn-primary btn-sm"
        >
          Post
        </button>
        <button type="button" onClick={collapse} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </section>
  );
}

function ImageGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.5" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m4 17 4.5-4.5 3 3L15 12l5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
