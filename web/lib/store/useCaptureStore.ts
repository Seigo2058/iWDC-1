import { create } from "zustand";

import type { AnalyzeFailureReason, FoodData } from "@/lib/analyze/types";

/** capture -> review (use this photo?) -> crop -> confirm (the cropped
 *  image, where analysis runs) -> result / notFound, with the first-time
 *  allergy step between confirm and the analysis. */
export type CaptureStep =
  | "capture"
  | "review"
  | "crop"
  | "confirm"
  | "allergy"
  | "result"
  | "notFound";

interface CaptureState {
  step: CaptureStep;
  rawImage: Blob | null;
  croppedImage: Blob | null;
  finalImage: Blob | null;
  /** Every dish recognized in the photo; more than one for a menu or a
   *  shared table. Non-empty whenever step is "result". */
  foods: FoodData[];
  /** When the analysis succeeded (ISO 8601). Recent Scan records this, not the
   *  time a dish is opened from a multi-dish list (recent-scans.md 3.1). */
  scannedAt: string | null;
  /** Set when analysis fails after leaving ConfirmStep (e.g. from the
   *  first-time allergy step), so ConfirmStep can surface it once it regains
   *  the "confirm" step. Cleared once read. */
  submitErrorReason: AnalyzeFailureReason | null;
  /** While runAnalysis is waiting on the API, so ConfirmStep shows the
   *  progress wherever the analysis was started from (itself, or the
   *  first-time allergy step, which hands back to it). */
  analyzing: boolean;
  setRawImage: (blob: Blob) => void;
  setCroppedImage: (blob: Blob) => void;
  setFinalImage: (blob: Blob) => void;
  setFoods: (foods: FoodData[]) => void;
  setSubmitErrorReason: (reason: AnalyzeFailureReason | null) => void;
  goToStep: (step: CaptureStep) => void;
  setAnalyzing: (analyzing: boolean) => void;
  reset: () => void;
}

const initialState = {
  step: "capture" as CaptureStep,
  rawImage: null,
  croppedImage: null,
  finalImage: null,
  foods: [] as FoodData[],
  scannedAt: null,
  submitErrorReason: null,
  analyzing: false,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,
  setRawImage: (blob) => set({ rawImage: blob, step: "review" }),
  // A new crop invalidates the previous one's compressed copy.
  setCroppedImage: (blob) =>
    set({ croppedImage: blob, finalImage: null, step: "confirm" }),
  setFinalImage: (blob) => set({ finalImage: blob }),
  setFoods: (foods) =>
    set({ foods, scannedAt: new Date().toISOString(), step: "result" }),
  setSubmitErrorReason: (reason) => set({ submitErrorReason: reason }),
  goToStep: (step) => set({ step }),
  setAnalyzing: (analyzing) => set({ analyzing }),
  reset: () => set({ ...initialState }),
}));
