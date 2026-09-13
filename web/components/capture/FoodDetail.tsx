"use client";

import { ChevronLeft, ExternalLink } from "lucide-react";
import { useState } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import { IngredientDetailModal } from "@/components/capture/IngredientDetailModal";
import { SpicyBadge } from "@/components/capture/SpicyBadge";
import {
  foodAllergens,
  foodIngredients,
  foodName,
  localizedText,
} from "@/lib/analyze/localize";
import type { FoodData } from "@/lib/analyze/types";
import { useT } from "@/lib/i18n/useT";

interface FoodDetailProps {
  food: FoodData;
  /** The user's own photo. Omitted when it shows several dishes (a menu or
   *  a shared table), since it wouldn't depict this one. */
  capturedPhotoUrl?: string | null;
  onBack?: () => void;
}

export function FoodDetail({ food, capturedPhotoUrl, onBack }: FoodDetailProps) {
  const t = useT();
  const lang = useLang();
  const [openIngredient, setOpenIngredient] = useState<string | null>(null);

  const nutrition = [
    { label: t("capture.result.calories"), value: food.calories, unit: "kcal" },
    { label: t("capture.result.protein"), value: food.protein, unit: "g" },
    { label: t("capture.result.carbs"), value: food.carbs, unit: "g" },
    { label: t("capture.result.fat"), value: food.fat, unit: "g" },
  ].filter((item) => item.value !== null);

  const ingredients = foodIngredients(food, lang);
  const allergens = foodAllergens(food, lang);
  const description = localizedText(food.description, lang);
  const howToEat = localizedText(food.howToEat, lang);

  return (
    <>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-1 text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          <ChevronLeft aria-hidden="true" size={16} />
          {t("capture.result.backToList")}
        </button>
      )}

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{foodName(food, lang)}</h1>
        {food.spicyLevel && <SpicyBadge level={food.spicyLevel} />}
      </header>

      {capturedPhotoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a client-side Blob object URL
        <img
          src={capturedPhotoUrl}
          alt=""
          className="max-h-64 w-full rounded-xl object-contain"
        />
      )}

      {food.imageUrl && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {t("capture.result.referencePhoto")}
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- external URL from the database, not a local/static asset */}
          <img
            src={food.imageUrl}
            alt={foodName(food, lang)}
            className="max-h-64 w-full rounded-xl object-contain"
          />
        </section>
      )}

      {description && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {t("capture.result.description")}
          </h2>
          <p className="leading-relaxed">{description}</p>
        </section>
      )}

      {nutrition.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {t("capture.result.nutrition")}
          </h2>
          <dl className="grid grid-cols-4 gap-2 text-center">
            {nutrition.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
              >
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  {item.label}
                </dt>
                <dd className="font-semibold">
                  {item.value}
                  <span className="ml-0.5 text-xs font-normal">{item.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("capture.result.perServing")}
          </p>
        </section>
      )}

      {ingredients.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {t("capture.result.ingredients")}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("capture.ingredient.hint")}
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {ingredients.map((ingredient) => (
              <li key={ingredient}>
                <button
                  type="button"
                  onClick={() => setOpenIngredient(ingredient)}
                  className="cursor-pointer rounded-full bg-black/[.05] px-3 py-1 text-sm transition-colors hover:bg-black/[.1] dark:bg-white/[.08] dark:hover:bg-white/[.16]"
                >
                  {ingredient}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {openIngredient && (
        <IngredientDetailModal
          key={openIngredient}
          ingredient={openIngredient}
          onClose={() => setOpenIngredient(null)}
        />
      )}

      {allergens.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {t("capture.result.allergens")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {allergens.map((allergen) => (
              <li
                key={allergen}
                className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                {allergen}
              </li>
            ))}
          </ul>
        </section>
      )}

      {howToEat && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {t("capture.result.howToEat")}
          </h2>
          <p className="leading-relaxed">{howToEat}</p>
        </section>
      )}

      {food.sourceUrl && (
        <a
          href={food.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-fit items-center gap-1 text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          {t("capture.result.source")}
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      )}
    </>
  );
}
