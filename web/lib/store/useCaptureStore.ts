import { create } from "zustand";

import type { FoodData } from "@/lib/analyze/types";

export type CaptureStep =
  | "capture"
  | "crop"
  | "confirm"
  | "result"
  | "notFound";

interface CaptureState {
  step: CaptureStep;
  rawImage: Blob | null;
  croppedImage: Blob | null;
  finalImage: Blob | null;
  food: FoodData | null;
  setRawImage: (blob: Blob) => void;
  setCroppedImage: (blob: Blob) => void;
  setFinalImage: (blob: Blob) => void;
  setFood: (food: FoodData) => void;
  goToStep: (step: CaptureStep) => void;
  reset: () => void;
}

const initialState = {
  step: "capture" as CaptureStep,
  rawImage: null,
  croppedImage: null,
  finalImage: null,
  food: null,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,
  setRawImage: (blob) => set({ rawImage: blob, step: "crop" }),
  setCroppedImage: (blob) => set({ croppedImage: blob, step: "confirm" }),
  setFinalImage: (blob) => set({ finalImage: blob }),
  setFood: (food) => set({ food, step: "result" }),
  goToStep: (step) => set({ step }),
  reset: () => set({ ...initialState }),
}));
