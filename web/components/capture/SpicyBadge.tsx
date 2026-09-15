"use client";

import { spicyLevelKey } from "@/lib/analyze/localize";
import type { SpicyLevel } from "@/lib/analyze/types";
import { useT } from "@/lib/i18n/useT";

export function SpicyBadge({ level }: { level: SpicyLevel }) {
  const t = useT();

  return (
    <span
      className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${
        level === "No Spicy"
          ? "bg-black/[.05] text-zinc-600 dark:bg-white/[.08] dark:text-zinc-300"
          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      {t("capture.result.spicyLevel")}:{" "}
      {t(`capture.result.spicy.${spicyLevelKey(level)}`)}
    </span>
  );
}
