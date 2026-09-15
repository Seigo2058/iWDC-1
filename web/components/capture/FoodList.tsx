"use client";

import Image from "next/image";

import { DishPhoto } from "@/components/home/DishPhoto";
import { useLang } from "@/components/i18n/I18nProvider";
import { FixedBottomBar } from "@/components/ui/FixedBottomBar";
import { foodName, localizedText } from "@/lib/analyze/localize";
import type { FoodData } from "@/lib/analyze/types";
import { useT } from "@/lib/i18n/useT";

interface FoodListProps {
  foods: FoodData[];
  onSelect: (index: number) => void;
  onBack: () => void;
}

/** Dishes found in one photo (Figma: phone "Information" / PC "MacBook Pro
 *  16' - 10"): a title with the count over photo + name + description cards
 *  (one column on phones, two on PC), each opening that dish's detail, and
 *  Back fixed at the bottom. */
export function FoodList({ foods, onSelect, onBack }: FoodListProps) {
  const t = useT();
  const lang = useLang();

  return (
    // Bottom padding keeps the last cards clear of the fixed Back button.
    <div className="flex flex-1 flex-col bg-[#f0f0f0] px-gutter pb-[140px] pt-10 font-brand md:pb-[200px] md:pt-[46px]">
      <h1 className="text-xl leading-[31.2px] font-medium text-[#422f11] md:text-[26px]">
        {t("capture.result.detectedFoods", { count: foods.length })}
      </h1>
      <p className="leading-[25.6px] text-[#564334] md:mt-1.5 md:text-xl">
        {t("capture.result.checkDishes")}
      </p>

      <ul className="mt-[11px] grid gap-3 md:mt-[42px] md:grid-cols-2 md:gap-x-9 md:gap-y-[41px]">
        {foods.map((food, index) => {
          const description = localizedText(food.description, lang);
          return (
            <li key={`${food.foodId ?? food.nameEn}-${index}`}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                className="flex w-full items-center gap-[19px] rounded-3xl border border-[rgba(86,67,52,0.16)] bg-white p-[11px] pr-[29px] text-left transition-colors hover:bg-[#fafafa] md:gap-[30px] md:rounded-[32px] md:border-0 md:py-[25.5px] md:pl-[26px] md:pr-8 md:shadow-[0_0_16px_rgba(0,0,0,0.24)]"
              >
                <DishPhoto
                  src={food.imageUrl}
                  className="h-[129px] w-[135px] shrink-0 rounded-xl md:h-[226px] md:w-[237px]"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xl font-medium break-words text-[#422f11] md:text-[22px]">
                    {foodName(food, lang)}
                  </span>
                  {description && (
                    <span className="line-clamp-4 text-xs leading-[1.3] tracking-[-0.24px] text-[#6a6a6a] md:max-w-[363px] md:text-base md:tracking-[-0.32px]">
                      {description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <FixedBottomBar className="pb-6 pt-11 md:pb-[54px] md:pt-[108px]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[78px] w-[221px] items-center justify-center gap-2 rounded-full bg-[#b5b5b5] px-[30px] text-xl font-bold tracking-[-0.4px] text-white transition-opacity hover:opacity-85"
        >
          <Image src="/images/icons/chevron-left.svg" alt="" width={24} height={24} className="size-6" />
          {t("capture.result.back")}
        </button>
      </FixedBottomBar>
    </div>
  );
}
