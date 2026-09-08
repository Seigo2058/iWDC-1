"use client";

import { CaptureStep } from "@/components/capture/CaptureStep";
import { ConfirmStep } from "@/components/capture/ConfirmStep";
import { CropStep } from "@/components/capture/CropStep";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

export default function CapturePage() {
  const step = useCaptureStore((state) => state.step);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      {step === "capture" && <CaptureStep />}
      {step === "crop" && <CropStep />}
      {step === "confirm" && <ConfirmStep />}
    </div>
  );
}
