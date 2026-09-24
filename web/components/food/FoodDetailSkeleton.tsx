"use client";

import { FOOD_DETAIL_LAYOUT, InfoCard } from "@/components/capture/FoodDetail";
import { ProgressText } from "@/components/ui/ProgressText";
import { useT } from "@/lib/i18n/useT";

// A pulsing placeholder block; `className` gives it its size and shape.
function Bone({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-[#e8e8e8] ${className}`} />;
}

/** The dish page while its data loads: the same layout, photo card and
 *  cards (titles included) as FoodDetail, with pulsing blocks where the
 *  photo, text, allergens, chips and values will be. The name shows at
 *  once when the history has it. */
export function FoodDetailSkeleton({ name }: { name: string | null }) {
  const t = useT();

  return (
    <div className={FOOD_DETAIL_LAYOUT.page}>
      <div className={FOOD_DETAIL_LAYOUT.grid}>
        <section className={FOOD_DETAIL_LAYOUT.photoCard}>
          <Bone className={FOOD_DETAIL_LAYOUT.photo} />
          <div className={FOOD_DETAIL_LAYOUT.photoText}>
            {name ? (
              <h1 className={FOOD_DETAIL_LAYOUT.name}>{name}</h1>
            ) : (
              <Bone className="h-8 w-3/5 rounded-lg md:h-11" />
            )}
            <div className="mt-2.5 flex flex-col gap-2 md:mt-5 md:max-w-[456px] md:gap-3">
              <Bone className="h-3.5 w-full rounded md:h-5" />
              <Bone className="h-3.5 w-4/5 rounded md:h-5" />
            </div>
            <p aria-live="polite" className="mt-4 text-sm text-[#6a6a6a] md:mt-6 md:text-xl">
              <ProgressText text={t("foodPage.loading")} />
            </p>
          </div>
        </section>

        <div className={FOOD_DETAIL_LAYOUT.cards}>
          <InfoCard
            icon="/images/icons/food/shield.svg"
            title={t("capture.result.ingredientsSafety")}
            className="md:order-[-2]"
          >
            <div className="rounded-2xl bg-[#f4f4f4] p-4 md:rounded-[23px] md:p-[25px]">
              <Bone className="h-[18px] w-1/2 rounded md:h-7" />
              <div className="mt-3.5 grid grid-cols-2 gap-3 md:mt-5 md:gap-[17.5px]">
                <Bone className="h-[55px] rounded-2xl md:h-20 md:rounded-[23px]" />
                <Bone className="h-[55px] rounded-2xl md:h-20 md:rounded-[23px]" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-1.5 gap-y-2 px-[3px] md:mt-6 md:gap-x-2 md:gap-y-3 md:px-1">
              {["w-16", "w-20", "w-14", "w-24", "w-[4.5rem]"].map((width) => (
                <Bone key={width} className={`h-[29px] rounded-full md:h-[30px] ${width}`} />
              ))}
            </div>
          </InfoCard>

          <InfoCard icon="/images/icons/food/fire.svg" title={t("capture.result.spicyLevel")}>
            <div className="flex items-center gap-x-6 pl-[11px] md:gap-x-9 md:pl-4">
              <Bone className="h-[30px] w-[140px] rounded-lg md:h-[43.5px] md:w-[206px]" />
              <Bone className="h-[39px] w-24 rounded-full md:h-[57px] md:w-36" />
            </div>
          </InfoCard>

          <InfoCard icon="/images/icons/food/dining.svg" title={t("capture.result.howToEat")}>
            <div className="flex flex-col gap-2 px-[5px] md:gap-3 md:px-2">
              <Bone className="h-3.5 w-full rounded md:h-5" />
              <Bone className="h-3.5 w-3/4 rounded md:h-5" />
            </div>
          </InfoCard>

          <InfoCard
            icon="/images/icons/food/chart.svg"
            title={t("capture.result.nutrition")}
            className="md:order-[-1]"
          >
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
              {[0, 1, 2, 3].map((index) => (
                <Bone key={index} className="h-[85px] rounded-2xl md:h-[124px] md:rounded-[23px]" />
              ))}
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
