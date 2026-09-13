"use client";

import { ChevronRight } from "lucide-react";

import { useLang } from "@/components/i18n/I18nProvider";
import { SpicyBadge } from "@/components/capture/SpicyBadge";
import { foodName, localizedText } from "@/lib/analyze/localize";
import type { FoodData } from "@/lib/analyze/types";
import { useT } from "@/lib/i18n/useT";

interface FoodListProps {
  foods: FoodData[];
  capturedPhotoUrl: string | null;
  onSelect: (index: number) => void;
}

export function FoodList({ foods, capturedPhotoUrl, onSelect }: FoodListProps) {
  const t = useT();
  const lang = useLang();

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {t("capture.result.foundCount", { count: foods.length })}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("capture.result.selectDish")}
        </p>
      </header>

      {capturedPhotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a client-side Blob object URL
        <img
          src={capturedPhotoUrl}
          alt=""
          className="max-h-48 w-full rounded-xl object-contain"
        />
      )}

      <ul className="flex flex-col gap-2">
        {foods.map((food, index) => {
          const name = foodName(food, lang);
          const description = localizedText(food.description, lang);
          return (
            <li key={`${food.foodId ?? food.nameEn}-${index}`}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                className="flex w-full items-center gap-3 rounded-xl border border-black/[.08] p-3 text-left transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                {food.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external URL from the database, not a local/static asset
                  <img
                    src={food.imageUrl}
                    alt=""
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-semibold">{name}</span>
                  {description && (
                    <span className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {description}
                    </span>
                  )}
                  {food.spicyLevel && <SpicyBadge level={food.spicyLevel} />}
                </div>
                <ChevronRight
                  aria-hidden="true"
                  size={20}
                  className="shrink-0 text-zinc-400"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
