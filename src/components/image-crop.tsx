"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/components/use-scroll-lock";

/* ===========================================================================
 * Crop, before anything uses the picture.
 *
 * Every image in the app goes through here — profile picture, cover, post
 * attachment — because picking a file and having it applied instantly gives
 * nobody a chance to frame it, and a portrait photo dropped into a 3:1 banner
 * without a crop is just a badly cut portrait photo.
 *
 * Entirely client-side. The file never leaves the browser: it is drawn into a
 * canvas at its natural resolution, cropped, and handed back as an object URL,
 * which is exactly the same mock-phase limitation everything else has — the
 * picture lasts as long as the tab and there is nowhere to upload it to yet.
 *
 * The aspect ratio is the caller's decision, and it is enforced while dragging
 * rather than applied at the end, so what you frame is what you get:
 *
 *   1     profile picture — square
 *   3     cover — a wide banner
 *   null  post attachment — freeform, whatever suits the picture
 * ========================================================================= */

type Rect = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "ne" | "sw" | "se";
type Drag =
  | { mode: "move"; startX: number; startY: number; rect: Rect }
  | { mode: Handle; startX: number; startY: number; rect: Rect };

/** Smallest crop we allow, in on-screen pixels. */
const MIN_SIZE = 48;
/** The stage the image is fitted into. */
const STAGE_W = 560;
const STAGE_H = 380;

export function useImageCrop({
  aspect,
  title,
  hint,
  onCropped,
}: {
  aspect: number | null;
  title: string;
  hint?: string;
  onCropped: (url: string) => void;
}) {
  const [source, setSource] = useState<{ url: string; type: string } | null>(null);

  const close = useCallback(() => {
    setSource((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  /** Hand a picked file in here. Non-images are ignored, as before. */
  const pick = useCallback((file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSource((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { url: URL.createObjectURL(file), type: file.type };
    });
  }, []);

  const cropper = source ? (
    <ImageCropModal
      src={source.url}
      type={source.type}
      aspect={aspect}
      title={title}
      hint={hint}
      onCancel={close}
      onConfirm={(url) => {
        close();
        onCropped(url);
      }}
    />
  ) : null;

  return { pick, cropper };
}

function ImageCropModal({
  src,
  type,
  aspect,
  title,
  hint,
  onCancel,
  onConfirm,
}: {
  src: string;
  type: string;
  aspect: number | null;
  title: string;
  hint?: string;
  onCancel: () => void;
  onConfirm: (url: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useScrollLock(true);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  /** Fit the image into the stage, then drop the largest legal crop into it. */
  function onLoad() {
    const img = imgRef.current;
    if (!img) return;

    const scale = Math.min(STAGE_W / img.naturalWidth, STAGE_H / img.naturalHeight, 1);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    setLayout({ w, h });

    if (aspect === null) {
      setRect({ x: 0, y: 0, w, h });
      return;
    }
    // The biggest rect of this aspect that fits, centred.
    let cw = w;
    let ch = cw / aspect;
    if (ch > h) {
      ch = h;
      cw = ch * aspect;
    }
    setRect({ x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch });
  }

  const clamp = useCallback((next: Rect, bounds: { w: number; h: number }): Rect => {
    const w = Math.min(next.w, bounds.w);
    const h = Math.min(next.h, bounds.h);
    return {
      w,
      h,
      x: Math.min(Math.max(0, next.x), bounds.w - w),
      y: Math.min(Math.max(0, next.y), bounds.h - h),
    };
  }, []);

  /* Pointer handling lives on the window so a fast drag that leaves the frame
     keeps working — a crop handle you can outrun is a crop handle that feels
     broken. */
  useEffect(() => {
    if (!layout) return;

    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || !layout) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const start = drag.rect;

      if (drag.mode === "move") {
        setRect(clamp({ ...start, x: start.x + dx, y: start.y + dy }, layout));
        return;
      }

      // Resize from a corner, with the opposite corner pinned.
      const right = drag.mode === "ne" || drag.mode === "se";
      const bottom = drag.mode === "se" || drag.mode === "sw";
      const anchorX = right ? start.x : start.x + start.w;
      const anchorY = bottom ? start.y : start.y + start.h;

      let w = Math.max(MIN_SIZE, right ? start.w + dx : start.w - dx);
      let h = Math.max(MIN_SIZE, bottom ? start.h + dy : start.h - dy);

      if (aspect !== null) {
        // Follow whichever edge the pointer pushed harder, so the drag never
        // feels like it is fighting you.
        if (Math.abs(dx) > Math.abs(dy)) h = w / aspect;
        else w = h * aspect;
      }

      // Do not let the crop run off the image.
      w = Math.min(w, right ? layout.w - anchorX : anchorX);
      h = Math.min(h, bottom ? layout.h - anchorY : anchorY);
      if (aspect !== null) {
        // Re-apply after clamping, or the ratio drifts at the edges.
        if (w / aspect > h) w = h * aspect;
        else h = w / aspect;
      }

      setRect(
        clamp(
          {
            x: right ? anchorX : anchorX - w,
            y: bottom ? anchorY : anchorY - h,
            w,
            h,
          },
          layout,
        ),
      );
    }

    function onUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [layout, aspect, clamp]);

  function startDrag(mode: Drag["mode"], event: React.PointerEvent) {
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { mode, startX: event.clientX, startY: event.clientY, rect };
  }

  /** Nudge the frame with the keyboard, for anyone not using a pointer. */
  function onFrameKeyDown(event: React.KeyboardEvent) {
    if (!rect || !layout) return;
    const step = event.shiftKey ? 20 : 4;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setRect(clamp({ ...rect, x: rect.x + move[0], y: rect.y + move[1] }, layout));
  }

  async function confirm() {
    const img = imgRef.current;
    if (!img || !rect || !layout) return;
    setBusy(true);

    // Back from stage pixels to the image's own pixels, so the crop keeps the
    // original's resolution rather than the size it happened to be shown at.
    const scale = img.naturalWidth / layout.w;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.w * scale));
    canvas.height = Math.max(1, Math.round(rect.h * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    ctx.drawImage(
      img,
      rect.x * scale,
      rect.y * scale,
      rect.w * scale,
      rect.h * scale,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const mime = type === "image/png" || type === "image/webp" ? type : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.92));
    setBusy(false);
    if (blob) onConfirm(URL.createObjectURL(blob));
  }

  /*
   * Portalled to <body>, like the login modal and for the same reason: this
   * can be opened from inside the header, and the header's backdrop-filter
   * makes it a containing block for fixed-position descendants — an
   * un-portalled `fixed inset-0` would size itself to the header.
   */
  return createPortal(
    <div
      className="z-modal-overlay fixed inset-0 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel cropping"
        className="bg-scrim absolute inset-0 backdrop-blur-[1px]"
      />

      <div className="card relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto p-5 sm:p-6">
        <h2 className="text-2xl leading-tight">{title}</h2>
        <p className="text-ink-soft mt-1 text-sm">
          {hint ?? "Drag the frame to move it, or a corner to resize it."}
        </p>

        <div className="bg-paper-deep border-line mt-4 flex items-center justify-center overflow-hidden rounded-xl border p-3">
          <div
            className="relative touch-none select-none"
            style={layout ? { width: layout.w, height: layout.h } : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              onLoad={onLoad}
              draggable={false}
              className="block max-w-full"
              style={layout ? { width: layout.w, height: layout.h } : { maxHeight: STAGE_H }}
            />

            {rect && layout ? (
              <>
                {/* Everything outside the frame, dimmed. Four panes rather
                    than one box-shadow so the dark area is real geometry and
                    cannot drift from the frame. */}
                <Shade style={{ left: 0, top: 0, width: layout.w, height: rect.y }} />
                <Shade
                  style={{
                    left: 0,
                    top: rect.y + rect.h,
                    width: layout.w,
                    height: layout.h - rect.y - rect.h,
                  }}
                />
                <Shade style={{ left: 0, top: rect.y, width: rect.x, height: rect.h }} />
                <Shade
                  style={{
                    left: rect.x + rect.w,
                    top: rect.y,
                    width: layout.w - rect.x - rect.w,
                    height: rect.h,
                  }}
                />

                <div
                  role="group"
                  aria-label="Crop area — arrow keys move it"
                  tabIndex={0}
                  onKeyDown={onFrameKeyDown}
                  onPointerDown={(event) => startDrag("move", event)}
                  className="absolute cursor-move outline-2 outline-offset-0 outline-white"
                  style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
                >
                  <CornerHandle corner="nw" onPointerDown={startDrag} />
                  <CornerHandle corner="ne" onPointerDown={startDrag} />
                  <CornerHandle corner="sw" onPointerDown={startDrag} />
                  <CornerHandle corner="se" onPointerDown={startDrag} />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="border-line mt-5 flex flex-wrap items-center gap-3 border-t pt-5">
          <button
            type="button"
            onClick={confirm}
            disabled={!rect || busy}
            className="btn btn-primary btn-sm"
          >
            {busy ? "Cropping…" : "Use this crop"}
          </button>
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <p className="text-ink-faint ml-auto text-xs">
            {aspect === null ? "Any shape" : aspect === 1 ? "Square" : `${aspect}:1 banner`}
            {rect ? ` · ${Math.round(rect.w)}×${Math.round(rect.h)}` : ""}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Shade({ style }: { style: React.CSSProperties }) {
  return <div aria-hidden className="bg-scrim pointer-events-none absolute" style={style} />;
}

const CORNER_CLASS: Record<Handle, string> = {
  nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
  ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
};

function CornerHandle({
  corner,
  onPointerDown,
}: {
  corner: Handle;
  onPointerDown: (mode: Handle, event: React.PointerEvent) => void;
}) {
  return (
    <span
      role="presentation"
      onPointerDown={(event) => onPointerDown(corner, event)}
      className={`border-ink absolute h-3 w-3 rounded-full border-2 bg-white ${CORNER_CLASS[corner]}`}
    />
  );
}
