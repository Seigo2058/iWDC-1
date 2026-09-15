"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { DishPhoto } from "@/components/home/DishPhoto";
import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { formatScannedAt } from "@/lib/recentScans/formatScannedAt";
import {
  getRecentScansSnapshot,
  getServerRecentScansSnapshot,
  recentScanFoodName,
  subscribeRecentScans,
} from "@/lib/recentScans/storage";

/** The dishes of one multi-dish scan from Recent Scan (recent-scans.md 4.5),
 *  built from the saved history; each opens the dish's detail page. */
export function ScanGroupView({ scanId }: { scanId: string }) {
  const t = useT();
  const lang = useLang();
  const scans = useSyncExternalStore(
    subscribeRecentScans,
    getRecentScansSnapshot,
    getServerRecentScansSnapshot,
  );
  const scan = scans?.find((entry) => entry.id === scanId);

  return (
    <div className="flex flex-1 flex-col gap-5 bg-zinc-50 p-4 dark:bg-black">
      <Link
        href={`/${lang}`}
        className="flex w-fit items-center gap-1 text-sm text-zinc-600 underline dark:text-zinc-400"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        {t("foodPage.backHome")}
      </Link>

      {scans === null ? (
        // Local Storage is only readable after hydration.
        <div aria-hidden="true" className="flex flex-col gap-3">
          <div className="h-8 w-1/2 animate-pulse rounded bg-black/[.08] dark:bg-white/[.12]" />
          <div className="h-20 animate-pulse rounded-xl bg-black/[.06] dark:bg-white/[.1]" />
        </div>
      ) : !scan ? (
        <p className="text-zinc-700 dark:text-zinc-300">{t("scanPage.notFound")}</p>
      ) : (
        <>
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">
              {t("scanPage.heading", { count: scan.foods.length })}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatScannedAt(scan.scannedAt, lang, t, new Date())}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("capture.result.selectDish")}
            </p>
          </header>

          <ul className="flex flex-col gap-2">
            {scan.foods.map((food) => (
              <li key={food.foodId}>
                <Link
                  href={`/${lang}/foods/${food.foodId}`}
                  className="flex items-center gap-3 rounded-xl border border-black/[.08] p-3 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  <DishPhoto src={food.imageUrl} className="size-16 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1 font-semibold">
                    {recentScanFoodName(food, lang)}
                  </span>
                  <ChevronRight aria-hidden="true" size={20} className="shrink-0 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
