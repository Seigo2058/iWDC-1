"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import { submitPhoto } from "@/lib/capture/submitPhoto";
import { useT } from "@/lib/i18n/useT";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

type Status = "compressing" | "ready" | "submitting" | "done";

export function ConfirmStep() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();

  const croppedImage = useCaptureStore((state) => state.croppedImage);
  const finalImage = useCaptureStore((state) => state.finalImage);
  const setFinalImage = useCaptureStore((state) => state.setFinalImage);
  const goToStep = useCaptureStore((state) => state.goToStep);
  const reset = useCaptureStore((state) => state.reset);

  const [status, setStatus] = useState<Status>("compressing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!croppedImage) return;

    let cancelled = false;

    (async () => {
      setStatus("compressing");
      setErrorMessage(null);

      try {
        const imageCompression = (await import("browser-image-compression"))
          .default;
        const file = new File([croppedImage], "photo.jpg", {
          type: croppedImage.type || "image/jpeg",
        });
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 2000,
          maxSizeMB: 2,
          // A web worker can silently hang in sandboxed/CSP-restricted
          // contexts (no message ever comes back, so the await never
          // settles); run on the main thread instead for reliability.
          useWebWorker: false,
        });
        if (cancelled) return;
        setFinalImage(compressed);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setErrorMessage(t("capture.confirming.errorCompress"));
        setFinalImage(croppedImage);
        setStatus("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [croppedImage, setFinalImage, t]);

  const previewUrl = useObjectUrl(finalImage ?? croppedImage);

  const handleDecide = async () => {
    const image = finalImage ?? croppedImage;
    if (!image) return;
    setStatus("submitting");
    await submitPhoto(image);
    setStatus("done");
    setTimeout(() => {
      // Don't reset() here: it flips `step` back to "capture" while this
      // component is still mounted on /capture, which briefly swaps in
      // CaptureStep and fires its auto-open-camera effect before the
      // navigation below unmounts it. TakePhotoButton resets state at the
      // start of the next session instead.
      router.push(`/${lang}`);
    }, 1000);
  };

  const handleRedoCrop = () => {
    goToStep("crop");
  };

  const handleRetake = () => {
    reset();
    goToStep("capture");
  };

  const isBusy =
    status === "compressing" || status === "submitting" || status === "done";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">
        {t("capture.confirming.heading")}
      </h1>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- previewing a client-side Blob object URL
          <img
            src={previewUrl}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      {status === "compressing" && (
        <p className="text-zinc-600 dark:text-zinc-400">
          {t("capture.confirming.compressing")}
        </p>
      )}
      {status === "done" && (
        <p className="text-green-600 dark:text-green-400">
          {t("capture.confirming.done")}
        </p>
      )}
      {errorMessage && (
        <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleDecide}
          disabled={isBusy}
          className="rounded-full bg-foreground px-8 py-4 text-lg font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {t("capture.confirming.decide")}
        </button>
        <button
          type="button"
          onClick={handleRedoCrop}
          disabled={status === "submitting" || status === "done"}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          {t("capture.confirming.redoCrop")}
        </button>
        <button
          type="button"
          onClick={handleRetake}
          disabled={status === "submitting" || status === "done"}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          {t("capture.confirming.retake")}
        </button>
      </div>
    </div>
  );
}
