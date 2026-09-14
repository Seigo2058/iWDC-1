import { create } from "zustand";

import type { AnalyzeFailureReason, FoodData } from "@/lib/analyze/types";

export type CaptureStep =
  | "capture"
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
  setRawImage: (blob: Blob) => void;
  setCroppedImage: (blob: Blob) => void;
  setFinalImage: (blob: Blob) => void;
  setFoods: (foods: FoodData[]) => void;
  setSubmitErrorReason: (reason: AnalyzeFailureReason | null) => void;
  goToStep: (step: CaptureStep) => void;
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
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,
  setRawImage: (blob) => set({ rawImage: blob, step: "crop" }),
  setCroppedImage: (blob) => set({ croppedImage: blob, step: "confirm" }),
  setFinalImage: (blob) => set({ finalImage: blob }),
  setFoods: (foods) =>
    set({ foods, scannedAt: new Date().toISOString(), step: "result" }),
  setSubmitErrorReason: (reason) => set({ submitErrorReason: reason }),
  goToStep: (step) => set({ step }),
  reset: () => set({ ...initialState }),
}));
