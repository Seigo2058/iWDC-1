"use client";

import { useEffect, useState } from "react";

import {
  CaptureScreen,
  DecisionControls,
  FrameMessage,
  MessagePill,
} from "@/components/capture/CaptureScreen";
import { ProgressText } from "@/components/ui/ProgressText";
import { runAnalysis } from "@/lib/capture/runAnalysis";
import { hasStoredAllergySelection } from "@/lib/allergens/storage";
import { useT } from "@/lib/i18n/useT";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** "Confirm Image", the last check before analysis (Figma: phone "User" /
 *  PC "MacBook Pro 16' - 6"): the cropped image, small and centered in a
 *  grey frame; Back returns to cropping and the check mark sends it for
 *  analysis — by way of the allergy step the first time, which starts it
 *  and hands back here. "Analyzing..." shows here while it runs. On phones
 *  the screen is full-height without the site header, the hint above the
 *  frame. */
export function ConfirmStep() {
  const t = useT();

  const croppedImage = useCaptureStore((state) => state.croppedImage);
  const finalImage = useCaptureStore((state) => state.finalImage);
  const setFinalImage = useCaptureStore((state) => state.setFinalImage);
  const submitErrorReason = useCaptureStore((state) => state.submitErrorReason);
  const setSubmitErrorReason = useCaptureStore(
    (state) => state.setSubmitErrorReason,
  );
  const goToStep = useCaptureStore((state) => state.goToStep);
  const analyzing = useCaptureStore((state) => state.analyzing);

  // Coming back from the allergy step or the result, the compressed copy of
  // this crop is already there (a new crop clears it).
  const [compressing, setCompressing] = useState(!finalImage);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null,
  );

  // Analysis that failed surfaces here via the store, derived at render
  // time rather than mirrored into local state.
  const errorMessage =
    localErrorMessage ??
    (submitErrorReason
      ? t(`capture.confirming.error.${submitErrorReason}`)
      : null);

  useEffect(() => {
    if (!croppedImage || useCaptureStore.getState().finalImage) return;

    let cancelled = false;

    (async () => {
      setCompressing(true);
      setLocalErrorMessage(null);

      try {
        const imageCompression = (await import("browser-image-compression"))
          .default;
        const file = new File([croppedImage], "photo.jpg", {
          type: croppedImage.type || "image/jpeg",
        });
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 2000,
          maxSizeMB: 2,
          // A web worker can silently hang in sandboxed/CSP-restricted
          // contexts (no message ever comes back, so the await never
          // settles); run on the main thread instead for reliability.
          useWebWorker: false,
        });
        if (cancelled) return;
        setFinalImage(compressed);
        setCompressing(false);
      } catch {
        if (cancelled) return;
        setLocalErrorMessage(t("capture.confirming.errorCompress"));
        setFinalImage(croppedImage);
        setCompressing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [croppedImage, setFinalImage, t]);

  const previewUrl = useObjectUrl(finalImage ?? croppedImage);

  const handleDecide = () => {
    const image = finalImage ?? croppedImage;
    if (!image) return;

    // First-time flow: collect allergies before running AI analysis
    // (allergy-selection.md 3.1); AllergyStep starts it and hands back.
    if (!hasStoredAllergySelection()) {
      goToStep("allergy");
      return;
    }
    setLocalErrorMessage(null);
    // Technical failures land back here via submitErrorReason, read above;
    // success/notFound move the store on to another step.
    void runAnalysis(image);
  };

  const handleRedoCrop = () => {
    setSubmitErrorReason(null);
    goToStep("crop");
  };

  const isBusy = compressing || analyzing;

  // One message pill: an error or progress takes the place of the hint. On
  // phones it sits above the frame and always shows something; on PC it
  // only appears for these, at the bottom of the frame.
  const progressMessage =
    compressing ? (
      <ProgressText text={t("capture.confirming.compressing")} />
    ) : analyzing ? (
      <ProgressText text={t("capture.confirming.analyzing")} />
    ) : null;
  const message = errorMessage ?? progressMessage;

  return (
    <CaptureScreen
      heading={t("capture.confirming.heading")}
      className="bg-white md:bg-[#f0f0f0]"
      frameClassName="rounded-[32px] bg-[#e2e2e2] shadow-[0_0_12px_rgba(0,0,0,0.24)] md:rounded-[40px] md:border-4 md:border-[rgba(86,67,52,0.16)] md:shadow-[0_0_16px_rgba(0,0,0,0.24)]"
      phoneTopBar={
        <MessagePill alert={errorMessage !== null} className="mx-auto w-fit">
          {message ?? t("capture.confirming.hint")}
        </MessagePill>
      }
      frame={
        <>
          {previewUrl && (
            // Exactly what will be analyzed, whole and at no more than its
            // own size, centered with a wide margin as in the design.
            <div className="absolute inset-0 flex items-center justify-center p-[12%] md:p-[21%]">
              {/* eslint-disable-next-line @next/next/no-img-element -- previewing a client-side Blob object URL */}
              <img
                src={previewUrl}
                alt=""
                className="max-h-full max-w-full rounded-lg"
              />
            </div>
          )}
          {message && (
            <FrameMessage alert={errorMessage !== null} only="pc">
              {message}
            </FrameMessage>
          )}
        </>
      }
      controls={
        <DecisionControls
          label={t("capture.confirming.label")}
          backLabel={t("capture.confirming.redoCrop")}
          onBack={handleRedoCrop}
          backDisabled={analyzing}
          nextLabel={t("capture.confirming.decide")}
          onNext={handleDecide}
          nextDisabled={isBusy}
        />
      }
    />
  );
}
