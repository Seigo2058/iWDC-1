"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

export function CaptureStep() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const setRawImage = useCaptureStore((state) => state.setRawImage);
  const reset = useCaptureStore((state) => state.reset);

  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoOpened = useRef(false);
  const [status, setStatus] = useState<"idle" | "converting" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCamera = () => {
    inputRef.current?.click();
  };

  useEffect(() => {
    if (hasAutoOpened.current) return;
    hasAutoOpened.current = true;
    openCamera();
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const heic = isHeicFile(file);
    if (!file.type.startsWith("image/") && !heic) {
      setStatus("error");
      setErrorMessage(t("capture.capturing.errorInvalidFile"));
      return;
    }

    if (!heic) {
      setRawImage(file);
      return;
    }

    setStatus("converting");
    setErrorMessage(null);
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: file, toType: "image/jpeg" });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      setRawImage(blob);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage(t("capture.capturing.errorHeicConvert"));
    }
  };

  const handleCancel = () => {
    reset();
    router.push(`/${lang}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16">
      <h1 className="text-xl font-semibold">
        {t("capture.capturing.heading")}
      </h1>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {status === "converting" && (
        <p className="text-zinc-600 dark:text-zinc-400">
          {t("capture.capturing.converting")}
        </p>
      )}

      {status === "error" && errorMessage && (
        <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <button
        type="button"
        onClick={openCamera}
        disabled={status === "converting"}
        className="flex items-center gap-3 rounded-full bg-foreground px-8 py-4 text-lg font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        <Camera aria-hidden="true" size={24} />
        {t("capture.capturing.openCamera")}
      </button>

      <button
        type="button"
        onClick={handleCancel}
        className="text-sm text-zinc-600 underline dark:text-zinc-400"
      >
        {t("capture.capturing.cancel")}
      </button>
    </div>
  );
}
