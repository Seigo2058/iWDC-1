"use client";

import { AllergyStep } from "@/components/capture/AllergyStep";
import { CaptureStep } from "@/components/capture/CaptureStep";
import { ConfirmStep } from "@/components/capture/ConfirmStep";
import { CropStep } from "@/components/capture/CropStep";
import { NotFoundStep } from "@/components/capture/NotFoundStep";
import { ResultStep } from "@/components/capture/ResultStep";
import { ReviewStep } from "@/components/capture/ReviewStep";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

export default function CapturePage() {
  const step = useCaptureStore((state) => state.step);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      {step === "capture" && <CaptureStep />}
      {step === "review" && <ReviewStep />}
      {step === "crop" && <CropStep />}
      {step === "confirm" && <ConfirmStep />}
      {step === "allergy" && <AllergyStep />}
      {step === "result" && <ResultStep />}
      {step === "notFound" && <NotFoundStep />}
    </div>
  );
}
