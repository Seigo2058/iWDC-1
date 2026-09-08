"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

export function TakePhotoButton() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const reset = useCaptureStore((state) => state.reset);

  const handleClick = () => {
    reset();
    router.push(`/${lang}/capture`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-3 rounded-full bg-foreground px-8 py-4 text-lg font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
    >
      <Camera aria-hidden="true" size={24} />
      {t("capture.home.takePhoto")}
    </button>
  );
}
