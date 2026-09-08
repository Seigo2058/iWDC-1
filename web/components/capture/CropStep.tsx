"use client";

import "cropperjs/dist/cropper.css";
import "./cropper-overrides.css";

import type CropperJS from "cropperjs";
import type { ReactCropperElement } from "react-cropper";
import dynamic from "next/dynamic";
import { RotateCcw, RotateCw, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";

const Cropper = dynamic(
  () => import("react-cropper").then((mod) => mod.Cropper),
  { ssr: false },
);

// Cropper.js reports pinch as action "zoom" and image panning as "move" on
// the same cropend event it uses for the crop box. Only the crop box actions
// below should re-fit the view — otherwise every pinch is immediately undone
// by the fit and zooming looks like it does nothing.
// How much of the frame the selection takes up after the auto-fit. The
// remainder is the band of dimmed, out-of-selection image left visible
// around it.
const FIT_SCALE = 0.85;

const CROP_BOX_RESIZE_ACTIONS = new Set<CropperJS.Action>([
  "crop",
  "e",
  "w",
  "s",
  "n",
  "ne",
  "nw",
  "se",
  "sw",
]);

export function CropStep() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();

  const rawImage = useCaptureStore((state) => state.rawImage);
  const setCroppedImage = useCaptureStore((state) => state.setCroppedImage);
  const goToStep = useCaptureStore((state) => state.goToStep);
  const reset = useCaptureStore((state) => state.reset);

  const imageUrl = useObjectUrl(rawImage);
  // Read `.cropper` off the element at call time rather than caching the
  // instance from an init callback: React's Strict Mode double-invokes the
  // mount effect in dev, and an early-captured instance can go stale while
  // the DOM element moves on to a second, real instance.
  const cropperElRef = useRef<ReactCropperElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Touches inside the crop area belong to Cropper.js alone: swallow the
  // browser's default handling so an edge drag isn't taken as a swipe-back
  // navigation gesture (and so pinch doesn't zoom the page instead of the
  // photo). Registered non-passively, which addEventListener requires to
  // allow preventDefault on touch events.
  useEffect(() => {
    const element = cropAreaRef.current;
    if (!element) return;

    const swallowTouch = (event: TouchEvent) => event.preventDefault();
    element.addEventListener("touchstart", swallowTouch, { passive: false });
    element.addEventListener("touchmove", swallowTouch, { passive: false });

    return () => {
      element.removeEventListener("touchstart", swallowTouch);
      element.removeEventListener("touchmove", swallowTouch);
    };
  }, []);

  // Two-finger gestures are handled here rather than by Cropper.js, which
  // only ever reads them as a pinch (so a two-finger drag moves nothing) and
  // re-derives the scale from each finger's event separately (so the zoom
  // drifts as the fingers travel). `handleZoom` cancels its pinch; this
  // applies the spread as scale and the midpoint travel as pan, together, in
  // one transform anchored between the fingers.
  useEffect(() => {
    const element = cropAreaRef.current;
    if (!element) return;

    const points = new Map<number, { x: number; y: number }>();
    let previous: { x: number; y: number; spread: number } | null = null;
    let origin = { left: 0, top: 0 };

    const readGesture = () => {
      const [first, second] = [...points.values()];
      if (!first || !second) return null;
      return {
        x: (first.x + second.x) / 2 - origin.left,
        y: (first.y + second.y) / 2 - origin.top,
        spread: Math.hypot(first.x - second.x, first.y - second.y),
      };
    };

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    const trackDown = (event: PointerEvent) => {
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const container = element.querySelector(".cropper-container");
      const rect = (container ?? element).getBoundingClientRect();
      origin = { left: rect.left, top: rect.top };
      previous = points.size >= 2 ? readGesture() : null;
    };

    const transform = (event: PointerEvent) => {
      if (!points.has(event.pointerId)) return;
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (points.size < 2) return;

      const next = readGesture();
      const cropper = cropperElRef.current?.cropper;

      if (previous && next && cropper && previous.spread > 0) {
        const canvasData = cropper.getCanvasData();
        const cropBoxData = cropper.getCropBoxData();

        // Scale strictly from how far the fingers spread, so a pure
        // two-finger drag (spread unchanged) does not creep in zoom.
        // Cropper.js's own viewMode limits still stop the photo from
        // shrinking inside the selection.
        const scale = clamp(next.spread / previous.spread, 0.5, 2);
        const width = canvasData.width * scale;
        const height = canvasData.height * scale;

        // Keep whatever was under the fingers under them as they move.
        const anchorX = (previous.x - canvasData.left) / canvasData.width;
        const anchorY = (previous.y - canvasData.top) / canvasData.height;

        cropper.setCanvasData({
          left: clamp(
            next.x - anchorX * width,
            cropBoxData.left + cropBoxData.width - width,
            cropBoxData.left,
          ),
          top: clamp(
            next.y - anchorY * height,
            cropBoxData.top + cropBoxData.height - height,
            cropBoxData.top,
          ),
          width,
          height,
        });
      }

      previous = next;
    };

    const trackUp = (event: PointerEvent) => {
      points.delete(event.pointerId);
      previous = points.size >= 2 ? readGesture() : null;
    };

    element.addEventListener("pointerdown", trackDown);
    document.addEventListener("pointermove", transform);
    document.addEventListener("pointerup", trackUp);
    document.addEventListener("pointercancel", trackUp);

    return () => {
      element.removeEventListener("pointerdown", trackDown);
      document.removeEventListener("pointermove", transform);
      document.removeEventListener("pointerup", trackUp);
      document.removeEventListener("pointercancel", trackUp);
    };
  }, []);

  // Cropper.js's own pinch handling is cancelled here so the two-finger
  // effect above owns the gesture; wheel zoom on desktop still runs.
  const handleZoom = (event: CropperJS.ZoomEvent) => {
    const originalEvent = event.detail.originalEvent;
    if (originalEvent && originalEvent.type !== "wheel") {
      event.preventDefault();
    }
  };

  const handleNext = () => {
    const cropper = cropperElRef.current?.cropper;
    const canvas = cropper?.getCroppedCanvas();
    if (!canvas) {
      setErrorMessage(t("capture.cropping.errorCrop"));
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMessage(t("capture.cropping.errorCrop"));
          return;
        }
        setErrorMessage(null);
        setCroppedImage(blob);
      },
      "image/jpeg",
      0.92,
    );
  };

  // Zoom/recenter so the just-adjusted crop box fills most of the display
  // area, letting the user see the selected region at close to full size.
  // It deliberately stops short of the frame edges so the dimmed image
  // around the selection stays visible as context for what is being cut off.
  const handleCropEnd = (event: CropperJS.CropEndEvent) => {
    if (!CROP_BOX_RESIZE_ACTIONS.has(event.detail.action)) return;

    const cropper = cropperElRef.current?.cropper;
    if (!cropper) return;

    const data = cropper.getData();
    if (!data.width || !data.height) return;

    const containerData = cropper.getContainerData();
    const ratio =
      Math.min(
        containerData.width / data.width,
        containerData.height / data.height,
      ) * FIT_SCALE;

    const imageData = cropper.getImageData();
    const newCanvasWidth = imageData.naturalWidth * ratio;
    const newCanvasHeight = imageData.naturalHeight * ratio;

    const newCropBoxWidth = data.width * ratio;
    const newCropBoxHeight = data.height * ratio;
    const newCropBoxLeft = (containerData.width - newCropBoxWidth) / 2;
    const newCropBoxTop = (containerData.height - newCropBoxHeight) / 2;

    const fracX = data.x / imageData.naturalWidth;
    const fracY = data.y / imageData.naturalHeight;

    cropper.setCanvasData({
      left: newCropBoxLeft - fracX * newCanvasWidth,
      top: newCropBoxTop - fracY * newCanvasHeight,
      width: newCanvasWidth,
      height: newCanvasHeight,
    });
    cropper.setCropBoxData({
      left: newCropBoxLeft,
      top: newCropBoxTop,
      width: newCropBoxWidth,
      height: newCropBoxHeight,
    });
  };

  const handleRetake = () => {
    reset();
    goToStep("capture");
  };

  const handleCancel = () => {
    // Don't reset() here: it flips `step` back to "capture" while this
    // component is still mounted on /capture, which briefly swaps in
    // CaptureStep and fires its auto-open-camera effect before the
    // navigation below unmounts it. TakePhotoButton resets state at the
    // start of the next session instead.
    router.push(`/${lang}`);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">{t("capture.cropping.heading")}</h1>

      {/* Inset from the page edge: a phone's system back/forward swipe zone
          sits within ~20px of the screen edge and cannot be disabled from a
          web page, so the handles are kept out of it. */}
      <div
        ref={cropAreaRef}
        className="mx-4 h-[60vh] min-h-[320px] touch-none overscroll-x-none"
      >
        {imageUrl && (
          <Cropper
            ref={cropperElRef}
            src={imageUrl}
            viewMode={1}
            dragMode="move"
            movable
            zoomable
            cropBoxMovable
            cropBoxResizable
            guides
            background={false}
            responsive
            autoCropArea={1}
            checkOrientation={false}
            zoom={handleZoom}
            cropend={handleCropEnd}
            style={{ height: "100%", width: "100%" }}
          />
        )}
      </div>

      {errorMessage && (
        <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => cropperElRef.current?.cropper.rotate(-90)}
          aria-label={t("capture.cropping.rotateLeft")}
          className="rounded-full border border-black/[.08] p-3 dark:border-white/[.145]"
        >
          <RotateCcw size={20} />
        </button>
        <button
          type="button"
          onClick={() => cropperElRef.current?.cropper.rotate(90)}
          aria-label={t("capture.cropping.rotateRight")}
          className="rounded-full border border-black/[.08] p-3 dark:border-white/[.145]"
        >
          <RotateCw size={20} />
        </button>
        <button
          type="button"
          onClick={() => cropperElRef.current?.cropper.reset()}
          aria-label={t("capture.cropping.reset")}
          className="rounded-full border border-black/[.08] p-3 dark:border-white/[.145]"
        >
          <Undo2 size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleNext}
          className="rounded-full bg-foreground px-8 py-4 text-lg font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          {t("capture.cropping.next")}
        </button>
        <button
          type="button"
          onClick={handleRetake}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          {t("capture.cropping.retake")}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          {t("capture.capturing.cancel")}
        </button>
      </div>
    </div>
  );
}
