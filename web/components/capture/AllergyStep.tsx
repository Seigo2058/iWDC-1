"use client";

import { AllergySelectionForm } from "@/components/allergies/AllergySelectionForm";
import { runAnalysis } from "@/lib/capture/runAnalysis";
import { saveAllergySelection } from "@/lib/allergens/storage";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** First-time-only step inserted between ConfirmStep and AI analysis
 *  (allergy-selection.md 3.1). Save and Skip are treated the same: both
 *  persist the selection (possibly empty), start the analysis and hand
 *  back to ConfirmStep, which shows its progress. */
export function AllergyStep() {
  const croppedImage = useCaptureStore((state) => state.croppedImage);
  const finalImage = useCaptureStore((state) => state.finalImage);
  const goToStep = useCaptureStore((state) => state.goToStep);

  const proceed = (ids: string[]) => {
    const image = finalImage ?? croppedImage;
    if (!image) return;

    saveAllergySelection(ids);
    goToStep("confirm");
    void runAnalysis(image);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AllergySelectionForm
        initialSelected={[]}
        onSave={proceed}
        onBack={() => goToStep("confirm")}
        onSkip={() => proceed([])}
      />
    </div>
  );
}
