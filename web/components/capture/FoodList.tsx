"use client";

import { DishCardList } from "@/components/food/DishCardList";
import { useLang } from "@/components/i18n/I18nProvider";
import { foodName, localizedText } from "@/lib/analyze/localize";
import type { FoodData } from "@/lib/analyze/types";
import { useT } from "@/lib/i18n/useT";

interface FoodListProps {
  foods: FoodData[];
  onSelect: (index: number) => void;
  onBack: () => void;
}

/** Dishes found in the photo just analyzed; each opens its detail in place. */
export function FoodList({ foods, onSelect, onBack }: FoodListProps) {
  const t = useT();
  const lang = useLang();

  return (
    <DishCardList
      title={t("capture.result.detectedFoods", { count: foods.length })}
      subtitle={t("capture.result.checkDishes")}
      items={foods.map((food, index) => ({
        key: `${food.foodId ?? food.nameEn}-${index}`,
        name: foodName(food, lang),
        description: localizedText(food.description, lang) || null,
        imageUrl: food.imageUrl,
        onSelect: () => onSelect(index),
      }))}
      backLabel={t("capture.result.back")}
      onBack={onBack}
    />
  );
}
