import { create } from "zustand";

export type CaptureStep = "capture" | "crop" | "confirm";

interface CaptureState {
  step: CaptureStep;
  rawImage: Blob | null;
  croppedImage: Blob | null;
  finalImage: Blob | null;
  setRawImage: (blob: Blob) => void;
  setCroppedImage: (blob: Blob) => void;
  setFinalImage: (blob: Blob) => void;
  goToStep: (step: CaptureStep) => void;
  reset: () => void;
}

const initialState = {
  step: "capture" as CaptureStep,
  rawImage: null,
  croppedImage: null,
  finalImage: null,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,
  setRawImage: (blob) => set({ rawImage: blob, step: "crop" }),
  setCroppedImage: (blob) => set({ croppedImage: blob, step: "confirm" }),
  setFinalImage: (blob) => set({ finalImage: blob }),
  goToStep: (step) => set({ step }),
  reset: () => set({ ...initialState }),
}));
