"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { FoodDetail } from "@/components/capture/FoodDetail";
import { FoodList } from "@/components/capture/FoodList";
import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { saveRecentScan } from "@/lib/recentScans/storage";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** One dish goes straight to its detail card; several (a menu, a shared
 *  table) show a list first, and tapping one opens its detail. */
export function ResultStep() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();

  const foods = useCaptureStore((state) => state.foods);
  const scannedAt = useCaptureStore((state) => state.scannedAt);
  const finalImage = useCaptureStore((state) => state.finalImage);
  const croppedImage = useCaptureStore((state) => state.croppedImage);
  const goToStep = useCaptureStore((state) => state.goToStep);
  const reset = useCaptureStore((state) => state.reset);

  const previewUrl = useObjectUrl(finalImage ?? croppedImage);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const listScrollY = useRef(0);

  // The page scrolls on the window, so switching views would otherwise keep
  // the old offset: open a detail at its top, and return to the list where
  // the user left it.
  useLayoutEffect(() => {
    window.scrollTo(0, selectedIndex === null ? listScrollY.current : 0);
  }, [selectedIndex]);

  if (foods.length === 0) return null;

  const handleSelect = (index: number) => {
    listScrollY.current = window.scrollY;
    setSelectedIndex(index);
    // Only the dishes opened from a list go into Recent Scan
    // (recent-scans.md 3.1); a single dish was saved in runAnalysis.
    if (scannedAt) saveRecentScan(foods[index], scannedAt);
  };

  const handleTakeAnother = () => {
    reset();
    goToStep("capture");
  };

  const isSingle = foods.length === 1;
  const selectedFood = selectedIndex === null ? null : foods[selectedIndex];

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
      {isSingle ? (
        <FoodDetail food={foods[0]} capturedPhotoUrl={previewUrl} />
      ) : selectedFood ? (
        <FoodDetail
          food={selectedFood}
          onBack={() => setSelectedIndex(null)}
        />
      ) : (
        <FoodList
          foods={foods}
          capturedPhotoUrl={previewUrl}
          onSelect={handleSelect}
        />
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={handleTakeAnother}
          className="rounded-full bg-foreground px-8 py-4 text-lg font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          {t("capture.result.takeAnother")}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${lang}`)}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          {t("capture.result.backHome")}
        </button>
      </div>
    </div>
  );
}
