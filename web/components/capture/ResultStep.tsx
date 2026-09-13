"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import {
  foodAllergens,
  foodIngredients,
  foodName,
  localizedText,
  spicyLevelKey,
} from "@/lib/analyze/localize";
import { useT } from "@/lib/i18n/useT";
import { useObjectUrl } from "@/lib/hooks/useObjectUrl";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

export function ResultStep() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();

  const food = useCaptureStore((state) => state.food);
  const finalImage = useCaptureStore((state) => state.finalImage);
  const croppedImage = useCaptureStore((state) => state.croppedImage);
  const goToStep = useCaptureStore((state) => state.goToStep);
  const reset = useCaptureStore((state) => state.reset);

  const previewUrl = useObjectUrl(finalImage ?? croppedImage);

  if (!food) return null;

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

  const handleTakeAnother = () => {
    reset();
    goToStep("capture");
  };

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{foodName(food, lang)}</h1>
        {food.spicyLevel && (
          <span
            className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${
              food.spicyLevel === "No Spicy"
                ? "bg-black/[.05] text-zinc-600 dark:bg-white/[.08] dark:text-zinc-300"
                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {t("capture.result.spicyLevel")}:{" "}
            {t(`capture.result.spicy.${spicyLevelKey(food.spicyLevel)}`)}
          </span>
        )}
      </header>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- a client-side Blob object URL
        <img
          src={previewUrl}
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
          <ul className="flex flex-wrap gap-2">
            {ingredients.map((ingredient) => (
              <li
                key={ingredient}
                className="rounded-full bg-black/[.05] px-3 py-1 text-sm dark:bg-white/[.08]"
              >
                {ingredient}
              </li>
            ))}
          </ul>
        </section>
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
