"use client";

import "cropperjs/dist/cropper.css";
import "./cropper-overrides.css";

import type CropperJS from "cropperjs";
import type { ReactCropperElement } from "react-cropper";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import {
  CaptureScreen,
  DecisionControls,
  FrameMessage,
  MessagePill,
} from "@/components/capture/CaptureScreen";
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

// How far inside the photo's edges the initial selection starts, so its
// corners sit visibly within the photo rather than on its border.
const INITIAL_MARGIN = 8;

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

/** Zoom/recenter so the crop box fills most of the display area, letting the
 *  user see the selected region at close to full size. It deliberately stops
 *  short of the frame edges so the dimmed image around the selection stays
 *  visible as context for what is being cut off — and so the corner handles
 *  stay clear of the frame's rounded corners, which would clip them. */
function fitCropBoxToView(cropper: CropperJS) {
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

  // With viewMode 1, Cropper.js clamps the canvas so it always covers the
  // *current* crop box and is at least as large as it. At this point the
  // crop box is still where the finger left it, so for a box released near
  // the frame edge the new canvas was pushed back (and kept from shrinking)
  // to cover that old spot — and the box, re-centered below, then sat over a
  // different part of the photo than the one selected. Hiding the crop box
  // lifts those limits while the canvas moves; crop() brings it back.
  cropper.clear();
  cropper.setCanvasData({
    left: newCropBoxLeft - fracX * newCanvasWidth,
    top: newCropBoxTop - fracY * newCanvasHeight,
    width: newCanvasWidth,
    height: newCanvasHeight,
  });
  cropper.crop();
  cropper.setCropBoxData({
    left: newCropBoxLeft,
    top: newCropBoxTop,
    width: newCropBoxWidth,
    height: newCropBoxHeight,
  });
}

/** The whole photo as shown (Cropper.js fits it to the frame like
 *  object-fit: contain), less INITIAL_MARGIN on every side. */
function selectPhotoWithMargin(cropper: CropperJS) {
  const canvas = cropper.getCanvasData();
  const container = cropper.getContainerData();
  const left = Math.max(canvas.left, 0) + INITIAL_MARGIN;
  const top = Math.max(canvas.top, 0) + INITIAL_MARGIN;
  const right = Math.min(canvas.left + canvas.width, container.width) - INITIAL_MARGIN;
  const bottom = Math.min(canvas.top + canvas.height, container.height) - INITIAL_MARGIN;
  cropper.setCropBoxData({ left, top, width: right - left, height: bottom - top });
}

/** Crop Image (Figma: "Cropped Screen", phone and PC): the photo in a
 *  framed box with an orange-cornered selection; Back returns to the photo
 *  check and the check mark keeps the selection. On phones the screen is
 *  full-height without the site header, Reset and the hint above the
 *  frame; on PC Reset sits over the frame. */
export function CropStep() {
  const t = useT();

  const rawImage = useCaptureStore((state) => state.rawImage);
  const setCroppedImage = useCaptureStore((state) => state.setCroppedImage);
  const goToStep = useCaptureStore((state) => state.goToStep);

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

  // Only after the user adjusts the crop box itself: pinch and pan must not
  // be undone by a re-fit (see CROP_BOX_RESIZE_ACTIONS).
  const handleCropEnd = (event: CropperJS.CropEndEvent) => {
    if (!CROP_BOX_RESIZE_ACTIONS.has(event.detail.action)) return;

    const cropper = cropperElRef.current?.cropper;
    if (cropper) fitCropBoxToView(cropper);
  };

  const handleReady = () => {
    const cropper = cropperElRef.current?.cropper;
    if (cropper) selectPhotoWithMargin(cropper);
  };

  // Back to the view the screen opened with. Cropper.js's reset() restores
  // its own initial selection (the whole photo), so the margin is applied
  // again after it.
  const handleReset = () => {
    const cropper = cropperElRef.current?.cropper;
    if (!cropper) return;
    cropper.reset();
    selectPhotoWithMargin(cropper);
  };

  return (
    <CaptureScreen
      heading={t("capture.cropping.heading")}
      className="bg-white md:bg-[#f0f0f0]"
      frameClassName="rounded-[32px] bg-[rgba(41,41,41,0.2)] shadow-[0_0_12px_rgba(0,0,0,0.24)] md:rounded-[40px] md:bg-white md:shadow-[0_0_16px_rgba(0,0,0,0.24)]"
      phoneTopBar={
        // Reset flush with the frame's left edge; the pill centered on the
        // screen between two equal columns, as on the camera screen.
        <div className="grid grid-cols-[40px_1fr_40px] items-center gap-1.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={!imageUrl}
            aria-label={t("capture.cropping.reset")}
            className="flex size-10 items-center justify-center rounded-full bg-black/50 shadow-[0_0_4px_rgba(0,0,0,0.32)] backdrop-blur-[6px] transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            <Image src="/images/icons/rotate-left.svg" alt="" width={21} height={21} className="size-[21.33px]" />
          </button>
          <MessagePill alert={errorMessage !== null} className="justify-self-center">
            {errorMessage ?? t("capture.cropping.hint")}
          </MessagePill>
        </div>
      }
      frame={
        <>
          {/* The frame is inset from the page edge: a phone's system
              back/forward swipe zone sits within ~20px of the screen edge
              and cannot be disabled from a web page, so the handles are
              kept out of it. Cropper.js's initial view (viewMode 1) fits
              the photo to this area like object-fit: contain. */}
          <div
            ref={cropAreaRef}
            className="absolute inset-0 touch-none overscroll-x-none"
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
                guides={false}
                center={false}
                background={false}
                responsive
                autoCropArea={1}
                checkOrientation={false}
                ready={handleReady}
                zoom={handleZoom}
                cropend={handleCropEnd}
                style={{ height: "100%", width: "100%" }}
              />
            )}
          </div>
          {/* The PC design has no Reset; this one is sized like the camera
              screen's in-frame buttons there. */}
          <button
            type="button"
            onClick={handleReset}
            disabled={!imageUrl}
            className="absolute right-9 top-[33px] flex h-[100px] items-center justify-center gap-4 rounded-full bg-[#433f40] px-[60px] text-[28px] font-medium tracking-[-0.56px] text-white transition-opacity hover:opacity-85 disabled:opacity-50 max-md:hidden"
          >
            <Image src="/images/icons/rotate-left.svg" alt="" width={40} height={40} className="size-10" />
            {t("capture.cropping.reset")}
          </button>
          {errorMessage && (
            <FrameMessage alert only="pc">
              {errorMessage}
            </FrameMessage>
          )}
        </>
      }
      controls={
        <DecisionControls
          label={t("capture.cropping.label")}
          backLabel={t("capture.cropping.back")}
          onBack={() => goToStep("review")}
          nextLabel={t("capture.cropping.next")}
          onNext={handleNext}
          nextDisabled={!imageUrl}
        />
      }
    />
  );
}
