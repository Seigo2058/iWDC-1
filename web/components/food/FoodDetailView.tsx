"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { FoodDetail } from "@/components/capture/FoodDetail";
import { ErrorView, useErrorActions } from "@/components/error/ErrorView";
import { FoodDetailSkeleton } from "@/components/food/FoodDetailSkeleton";
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
  recentScanFoodName,
  removeFoodFromRecentScans,
  subscribeRecentScans,
} from "@/lib/recentScans/storage";

type State =
  | { status: "loading" }
  | { status: "success"; food: FoodData }
  | { status: "notFound" }
  | { status: "error"; reason: FetchFoodFailureReason };

/** A dish opened from Recent Scan, loaded fresh from the database
 *  (recent-scans.md 4.4, 6.2). Opening it does not change the history order.
 *  With `scanId` (opened from a multi-dish scan's list) it also offers Back
 *  to that list. */
export function FoodDetailView({ foodId, scanId }: { foodId: number; scanId?: string }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const { back, home } = useErrorActions();
  const [state, setState] = useState<State>({ status: "loading" });

  // The name saved in Recent Scan lets the heading show while loading.
  const scans = useSyncExternalStore(
    subscribeRecentScans,
    getRecentScansSnapshot,
    getServerRecentScansSnapshot,
  );
  const saved = scans
    ?.flatMap((scan) => scan.foods)
    .find((food) => food.foodId === foodId);
  const savedName = saved ? recentScanFoodName(saved, lang) : null;

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
        // It can never be opened again, so drop it from every scan in the
        // history (recent-scans.md 6.2).
        removeFoodFromRecentScans(foodId);
        setState({ status: "notFound" });
      } else {
        setState({ status: "error", reason: result.reason });
      }
    });

    return () => {
      ignore = true;
    };
  }, [isLoading, foodId]);

  // Back to the list the dish was opened from: a history step in the usual
  // case, or the list's URL when this page was opened on its own (reloads
  // keep the history, so that is only a fresh tab or a pasted link).
  const handleBackToScan = scanId
    ? () => {
        if (window.history.length > 1) router.back();
        else router.push(`/${lang}/scans/${encodeURIComponent(scanId)}`);
      }
    : undefined;

  // Loaded, the detail is its own full page (with Home at its end).
  if (state.status === "success") {
    return <FoodDetail food={state.food} onBack={handleBackToScan} />;
  }

  if (state.status === "notFound") {
    return (
      <ErrorView
        code="404"
        title={t("errorPage.dishNotFound.title")}
        message={t("foodPage.error.notFound")}
        back={back}
        primary={home}
      />
    );
  }

  if (state.status === "error") {
    return (
      <ErrorView
        code="500"
        title={t("errorPage.loadFailed.title")}
        message={t(`foodPage.error.${state.reason}`)}
        back={back}
        // A misconfigured app won't recover by retrying.
        primary={
          state.reason === "config"
            ? home
            : { label: t("errorPage.retry"), onClick: () => setState({ status: "loading" }) }
        }
      />
    );
  }

  // Loading: the page's own layout with placeholders, and the name from
  // the history already in place.
  return <FoodDetailSkeleton name={savedName} />;
}
