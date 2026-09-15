"use client";

import { useState } from "react";

import { AllergySelectionForm } from "@/components/allergies/AllergySelectionForm";
import { runAnalysis } from "@/lib/capture/runAnalysis";
import { saveAllergySelection } from "@/lib/allergens/storage";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** First-time-only step inserted between ConfirmStep and AI analysis
 *  (allergy-selection.md 3.1). Save and Skip are treated the same: both
 *  persist the selection (possibly empty) and resume analysis directly, with
 *  no way back to re-decide the photo. */
export function AllergyStep() {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const croppedImage = useCaptureStore((state) => state.croppedImage);
  const finalImage = useCaptureStore((state) => state.finalImage);

  const proceed = async (ids: string[]) => {
    const image = finalImage ?? croppedImage;
    if (!image) return;

    saveAllergySelection(ids);
    setBusy(true);
    await runAnalysis(image);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AllergySelectionForm
        initialSelected={[]}
        onSave={proceed}
        onSkip={() => proceed([])}
        busy={busy}
      />
      {busy && (
        <p className="p-4 text-center text-zinc-600 dark:text-zinc-400">
          {t("capture.confirming.analyzing")}
        </p>
      )}
    </div>
  );
}
