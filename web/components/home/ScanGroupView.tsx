"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { ErrorView, useErrorActions } from "@/components/error/ErrorView";
import { DishCardList } from "@/components/food/DishCardList";
import { useLang } from "@/components/i18n/I18nProvider";
import { fetchFood } from "@/lib/food/fetchFood";
import { useT } from "@/lib/i18n/useT";
import { formatScannedAt } from "@/lib/recentScans/formatScannedAt";
import {
  getRecentScansSnapshot,
  getServerRecentScansSnapshot,
  hasRecentScanDescription,
  recentScanFoodDescription,
  recentScanFoodName,
  saveRecentScanDescription,
  subscribeRecentScans,
} from "@/lib/recentScans/storage";

/** The dishes of one multi-dish scan from Recent Scan (recent-scans.md 4.5),
 *  in the same design as the list right after a scan, drawn from the saved
 *  history (name, description, photo). History saved before descriptions
 *  were kept gets them from the database once, saved back into the history.
 *  Each card opens the dish's page, which then offers Back to this list. */
export function ScanGroupView({ scanId }: { scanId: string }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const { back, home } = useErrorActions();
  const scans = useSyncExternalStore(
    subscribeRecentScans,
    getRecentScansSnapshot,
    getServerRecentScansSnapshot,
  );
  const scan = scans?.find((entry) => entry.id === scanId);

  // Dishes saved without a description: loaded once and saved into the
  // history (which then re-renders this list); ids that couldn't be loaded
  // are remembered so their cards stop showing the placeholder.
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const missingIds =
    scan?.foods
      .filter((food) => !hasRecentScanDescription(food))
      .map((food) => food.foodId)
      .join(",") ?? "";

  // Each dish is requested once: saving one shrinks `missingIds` and re-runs
  // this effect, which must not drop or repeat the others still in flight.
  // (A result arriving after leaving the page is still worth saving.)
  const requestedIds = useRef(new Set<number>());

  useEffect(() => {
    if (!missingIds) return;
    for (const id of missingIds.split(",").map(Number)) {
      if (requestedIds.current.has(id)) continue;
      requestedIds.current.add(id);
      fetchFood(id).then((result) => {
        if (result.outcome === "success") saveRecentScanDescription(result.food);
        else setFailedIds((previous) => [...previous, id]);
      });
    }
  }, [missingIds]);

  if (scans !== null && !scan) {
    return (
      <ErrorView
        code="404"
        title={t("errorPage.scanNotFound.title")}
        message={t("scanPage.notFound")}
        back={back}
        primary={home}
      />
    );
  }

  // Local Storage is only readable after hydration.
  if (!scan) {
    return <div aria-hidden="true" className="flex-1 bg-[#f0f0f0]" />;
  }

  return (
    <DishCardList
      title={t("capture.result.detectedFoods", { count: scan.foods.length })}
      meta={formatScannedAt(scan.scannedAt, lang, t, new Date())}
      subtitle={t("capture.result.checkDishes")}
      items={scan.foods.map((food) => ({
        key: String(food.foodId),
        name: recentScanFoodName(food, lang),
        description:
          hasRecentScanDescription(food) || failedIds.includes(food.foodId)
            ? recentScanFoodDescription(food, lang)
            : undefined,
        imageUrl: food.imageUrl,
        // The scan id lets the dish page offer Back to this list.
        href: `/${lang}/foods/${food.foodId}?scan=${encodeURIComponent(scan.id)}`,
      }))}
      backLabel={t("capture.result.back")}
      // Back to where the list was opened from (home, as a rule), or home
      // when this page was opened on its own.
      onBack={() => {
        if (window.history.length > 1) router.back();
        else router.push(`/${lang}`);
      }}
    />
  );
}
