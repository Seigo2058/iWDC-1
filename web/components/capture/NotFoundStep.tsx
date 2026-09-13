"use client";

import { SearchX } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

export function NotFoundStep() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();

  const goToStep = useCaptureStore((state) => state.goToStep);
  const reset = useCaptureStore((state) => state.reset);

  const handleRetake = () => {
    reset();
    goToStep("capture");
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <SearchX aria-hidden="true" size={48} className="text-zinc-400" />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">
          {t("capture.notFound.heading")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {t("capture.notFound.message")}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <button
          type="button"
          onClick={handleRetake}
          className="rounded-full bg-foreground px-8 py-4 text-lg font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          {t("capture.notFound.retake")}
        </button>
        <button
          type="button"
          onClick={() => goToStep("crop")}
          className="rounded-full border border-black/[.08] px-8 py-3 font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          {t("capture.notFound.redoCrop")}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${lang}`)}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          {t("capture.notFound.backHome")}
        </button>
      </div>
    </div>
  );
}
