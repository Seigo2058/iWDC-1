"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { FoodDetail } from "@/components/capture/FoodDetail";
import { useLang } from "@/components/i18n/I18nProvider";
import type { FoodData } from "@/lib/analyze/types";
import {
  fetchFood,
  type FetchFoodFailureReason,
} from "@/lib/food/fetchFood";
import { useT } from "@/lib/i18n/useT";
import {
  getRecentScansSnapshot,
  getServerRecentScansSnapshot,
  removeRecentScan,
  subscribeRecentScans,
} from "@/lib/recentScans/storage";

type State =
  | { status: "loading" }
  | { status: "success"; food: FoodData }
  | { status: "notFound" }
  | { status: "error"; reason: FetchFoodFailureReason };

/** A dish opened from Recent Scan, loaded fresh from the database
 *  (recent-scans.md 4.4, 6.2). Opening it does not change the history order. */
export function FoodDetailView({ foodId }: { foodId: number }) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useState<State>({ status: "loading" });

  // The name saved in Recent Scan lets the heading show while loading.
  const scans = useSyncExternalStore(
    subscribeRecentScans,
    getRecentScansSnapshot,
    getServerRecentScansSnapshot,
  );
  const saved = scans?.find((scan) => scan.foodId === foodId);
  const savedName = saved
    ? lang === "ja"
      ? saved.nameJp
      : lang === "th"
        ? saved.nameTh
        : saved.nameEn
    : null;

  // Entering "loading" (on mount, or via retry) starts a request; its answer
  // is ignored after leaving that state or unmounting.
  const isLoading = state.status === "loading";

  useEffect(() => {
    if (!isLoading) return;

    let ignore = false;
    fetchFood(foodId).then((result) => {
      if (ignore) return;
      if (result.outcome === "success") {
        setState({ status: "success", food: result.food });
      } else if (result.outcome === "notFound") {
        // It can never be opened again, so drop it from the history
        // (recent-scans.md 6.2).
        removeRecentScan(foodId);
        setState({ status: "notFound" });
      } else {
        setState({ status: "error", reason: result.reason });
      }
    });

    return () => {
      ignore = true;
    };
  }, [isLoading, foodId]);

  return (
    <div className="flex flex-1 flex-col gap-5 bg-zinc-50 p-4 dark:bg-black">
      <Link
        href={`/${lang}`}
        className="flex w-fit items-center gap-1 text-sm text-zinc-600 underline dark:text-zinc-400"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        {t("foodPage.backHome")}
      </Link>

      {state.status === "loading" && (
        <div aria-live="polite" className="flex flex-col gap-4">
          {savedName ? (
            <h1 className="text-2xl font-semibold">{savedName}</h1>
          ) : (
            <div className="h-8 w-2/3 animate-pulse rounded bg-black/[.08] dark:bg-white/[.12]" />
          )}
          <div className="aspect-[4/3] w-full max-w-md animate-pulse rounded-xl bg-black/[.06] dark:bg-white/[.1]" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-full animate-pulse rounded bg-black/[.08] dark:bg-white/[.12]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-black/[.08] dark:bg-white/[.12]" />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("foodPage.loading")}
          </p>
        </div>
      )}

      {state.status === "success" && <FoodDetail food={state.food} />}

      {state.status === "notFound" && (
        <p className="text-zinc-700 dark:text-zinc-300">
          {t("foodPage.error.notFound")}
        </p>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-red-600 dark:text-red-400">
            {t(`foodPage.error.${state.reason}`)}
          </p>
          {state.reason !== "config" && (
            <button
              type="button"
              onClick={() => setState({ status: "loading" })}
              className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              {t("foodPage.retry")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
