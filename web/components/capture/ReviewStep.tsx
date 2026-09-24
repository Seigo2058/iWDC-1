"use client";

import {
  CaptureScreen,
  CaptureTopBar,
  DecisionControls,
} from "@/components/capture/CaptureScreen";
import { useT } from "@/lib/i18n/useT";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** "Use this photo?" right after taking or choosing it, before cropping
 *  (Figma: phone "User" / PC "MacBook Pro 16' - 4"): the whole photo in the
 *  frame (green-bordered on phones); Back retakes it, the check mark goes on to crop.
 *  The hint sits above the frame. */
export function ReviewStep() {
  const t = useT();

  const rawImage = useCaptureStore((state) => state.rawImage);
  const goToStep = useCaptureStore((state) => state.goToStep);
  const reset = useCaptureStore((state) => state.reset);

  const imageUrl = useObjectUrl(rawImage);

  const handleRetake = () => {
    reset();
    goToStep("capture");
  };

  return (
    <CaptureScreen
      heading={t("capture.reviewing.heading")}
      className="bg-white md:bg-[#f0f0f0]"
      frameClassName="rounded-[32px] border-4 border-[#19532b] bg-[rgba(41,41,41,0.2)] md:rounded-[40px] md:border-0 md:bg-white md:shadow-[0_0_16px_rgba(0,0,0,0.24)]"
      topBar={<CaptureTopBar>{t("capture.reviewing.hint")}</CaptureTopBar>}
      frame={
        imageUrl && (
          // The whole photo (contain, not cover), so what is judged here is
          // everything the crop step will have to work with.
          // eslint-disable-next-line @next/next/no-img-element -- previewing a client-side Blob object URL
          <img src={imageUrl} alt="" className="absolute inset-0 size-full object-contain" />
        )
      }
      controls={
        <DecisionControls
          label={t("capture.reviewing.question")}
          backLabel={t("capture.reviewing.retake")}
          onBack={handleRetake}
          nextLabel={t("capture.reviewing.use")}
          onNext={() => goToStep("crop")}
          nextDisabled={!imageUrl}
        />
      }
    />
  );
}
