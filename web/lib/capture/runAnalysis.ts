import { submitPhoto } from "@/lib/capture/submitPhoto";
import { saveRecentScan } from "@/lib/recentScans/storage";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** Submits the confirmed photo and drives the capture store to the matching
 *  step. Shared between ConfirmStep and the first-time AllergyStep, since
 *  both can be the last thing the user does before AI analysis runs
 *  (allergy-selection.md 2, 3.1). Reads/writes the store directly (rather
 *  than via a hook) so it can be called from either component's event
 *  handlers without depending on which one is mounted when it resolves. */
export async function runAnalysis(image: Blob): Promise<void> {
  const { setAnalyzing, setSubmitErrorReason } = useCaptureStore.getState();
  setAnalyzing(true);
  setSubmitErrorReason(null);
  const result = await submitPhoto(image);
  setAnalyzing(false);
  const { setFoods, goToStep } = useCaptureStore.getState();

  if (result.outcome === "success") {
    setFoods(result.foods);
    // Every dish the scan found is recorded together, as one history entry
    // (recent-scans.md 3.1).
    const { scannedAt } = useCaptureStore.getState();
    if (scannedAt) saveRecentScan(result.foods, scannedAt);
    return;
  }

  if (result.outcome === "notFound") {
    goToStep("notFound");
    return;
  }

  setSubmitErrorReason(result.reason);
  goToStep("confirm");
}
