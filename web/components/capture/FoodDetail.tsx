"use client";

import { ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { AllergenCardIcon } from "@/components/allergies/AllergenIcon";
import { IngredientDetailModal } from "@/components/capture/IngredientDetailModal";
import { DishPhoto } from "@/components/home/DishPhoto";
import { useLang } from "@/components/i18n/I18nProvider";
import { matchAllergens, toAllergenId } from "@/lib/allergens/matchAllergens";
import {
  getServerAllergySelectionSnapshot,
  getStoredAllergySelectionSnapshot,
  subscribeAllergySelection,
} from "@/lib/allergens/storage";
import {
  audienceGroups,
  countryName,
  foodIngredients,
  foodName,
  localizedText,
  spicyLevelKey,
} from "@/lib/analyze/localize";
import type { FoodData, SpicyLevel } from "@/lib/analyze/types";
import { useT } from "@/lib/i18n/useT";

interface FoodDetailProps {
  food: FoodData;
  /** The user's own photo, shown when the dish has no reference photo.
   *  Omitted when it shows several dishes (a menu or a shared table), since
   *  it wouldn't depict this one. */
  capturedPhotoUrl?: string | null;
  /** Adds a Back button beside Home (e.g. back to the list of dishes). */
  onBack?: () => void;
}

// How many of the three chilies are filled for each level.
const CHILIES: Record<SpicyLevel, number> = {
  "No Spicy": 0,
  "Low Spicy": 1,
  "Medium Spicy": 2,
  "Very Spicy": 3,
};

/** The page's layout, shared with FoodDetailSkeleton so the loading
 *  placeholder matches it: the page, its photo-card + cards grid, the photo
 *  card, its photo, the name/description area below it, and the card
 *  column. */
export const FOOD_DETAIL_LAYOUT = {
  page: "flex flex-1 flex-col bg-[#f0f0f0] px-gutter pb-10 pt-[30px] font-brand md:h-[calc(100dvh-var(--site-header-height))] md:flex-none md:overflow-y-auto md:pb-16 md:pt-[55px]",
  grid: "grid gap-[19px] md:grid-cols-[859fr_512fr] md:items-start md:gap-[37px]",
  photoCard:
    "overflow-hidden rounded-[32px] border border-[rgba(86,67,52,0.16)] bg-white md:sticky md:top-0 md:flex md:max-h-(--photo-card-max-h) md:flex-col md:rounded-[48px] md:border-0 md:px-[19px] md:pt-[23px] md:[--photo-card-max-h:calc(100dvh-var(--site-header-height)-55px-4rem)]",
  photo:
    "aspect-[351/310] w-full rounded-t-3xl shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.03),0_12px_32px_rgba(0,0,0,0.02)] md:aspect-[821/617] md:min-h-0 md:rounded-3xl",
  photoText:
    "px-[25px] pb-[25px] pt-6 md:max-h-[calc(var(--photo-card-max-h)*0.6)] md:shrink-0 md:overflow-y-auto md:px-10 md:pb-12 md:pt-10",
  name: "text-2xl font-medium break-words text-[#422f11] md:text-[35.9px]",
  cards: "flex flex-col gap-[19px] md:gap-[27.6px]",
} as const;

/** One white rounded card of the detail, with its icon and title (also
 *  used by FoodDetailSkeleton). */
export function InfoCard({
  icon,
  title,
  className = "",
  children,
}: {
  icon: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-[32px] border border-[rgba(86,67,52,0.16)] bg-white p-[18px] pb-5 shadow-[0_0_20px_rgba(0,0,0,0.08)] md:rounded-[46.5px] md:border-[1.5px] md:p-[26px] md:pb-[30px] md:shadow-[0_0_29px_rgba(0,0,0,0.08)] ${className}`}
    >
      <h2 className="flex items-center gap-1 text-[22px] leading-[31.2px] font-medium text-[#564334] md:gap-1.5 md:text-[30px] md:leading-[45.4px]">
        <Image src={icon} alt="" width={26} height={26} className="size-[26px] shrink-0 md:size-[38px]" />
        {title}
      </h2>
      <div className="mt-2.5 md:mt-4">{children}</div>
    </section>
  );
}

const CHIP_CLASS =
  "rounded-full border-[0.5px] border-[#564334] bg-[#f4f4f4] px-[12.5px] pb-[5px] pt-[3.5px] text-sm leading-5 tracking-[-0.28px] text-[#564334] shadow-[0_1px_1px_rgba(0,0,0,0.05)] md:text-base md:tracking-[-0.32px]";

/** A dish's details (Figma: phone "Information" / PC "MacBook Pro 16' - 8"):
 *  the photo with name and description, then cards for ingredients and
 *  allergens (with where the dish is from), spiciness, who it suits, how to
 *  eat, nutrition and the source — one column on phones; on PC the photo
 *  card on the left and the cards on the right.
 *  On PC the screen below the header scrolls on its own, with the photo card
 *  held in place (shrinking its photo to fit the screen's height) while the
 *  cards scroll past. Home (and Back, when given) at the end. Sections
 *  without data are left out. */
export function FoodDetail({ food, capturedPhotoUrl, onBack }: FoodDetailProps) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [openIngredient, setOpenIngredient] = useState<string | null>(null);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);

  // The database stores allergens as the same English ids the allergy
  // settings save, so they are matched against the English list and shown
  // through the allergy list's labels in the current language.
  const allergens = food.allergens.en;
  const selection = useSyncExternalStore(
    subscribeAllergySelection,
    getStoredAllergySelectionSnapshot,
    getServerAllergySelectionSnapshot,
  );
  const hasSelection = selection.length > 0;
  const matched = matchAllergens(allergens, selection);
  const allergenLabel = (value: string) => {
    const id = toAllergenId(value);
    return id ? t(`allergies.items.${id}`) : value;
  };

  const name = foodName(food, lang);
  // The Thai name alongside, as on the design ("Som Tum (ส้มตำ)"), for
  // ordering by name; skipped when it is only the English fallback.
  const thaiName =
    lang !== "th" && food.nameTh !== food.nameEn && food.nameTh !== name
      ? food.nameTh
      : null;
  const description = localizedText(food.description, lang);
  const howToEat = localizedText(food.howToEat, lang);
  const ingredients = foodIngredients(food, lang);
  // One pill per group ("Adult", "Child"); a value the app doesn't know is
  // shown as is.
  const audiencePills = food.audience
    ? (audienceGroups(food.audience)?.map((group) => ({
        group,
        label: t(`capture.result.audience.${group}`),
      })) ?? [{ group: "adult" as const, label: food.audience }])
    : [];
  const country = food.country ? countryName(food.country, lang) : null;

  const nutrition = [
    { label: t("capture.result.calories"), value: food.calories, unit: "kcal" },
    { label: t("capture.result.protein"), value: food.protein, unit: "g" },
    { label: t("capture.result.fat"), value: food.fat, unit: "g" },
    { label: t("capture.result.carbs"), value: food.carbs, unit: "g" },
  ];
  const hasNutrition = nutrition.some((item) => item.value !== null);

  return (
    <div className={FOOD_DETAIL_LAYOUT.page}>
      {/* PC: the cards fade out under the header as they scroll up (Figma:
          the gradient over the column's top). Pinned to the scroll area's
          top edge: pulled up into the 55px top padding (mt -55px, then
          46px + mb 9px = 55px, so the content below stays where the padding
          puts it), and stuck there with a negative offset, since sticky
          offsets count from inside the padding. */}
      <div
        aria-hidden="true"
        className="pointer-events-none sticky top-[-55px] z-10 -mt-[55px] mb-[9px] hidden h-[46px] shrink-0 bg-linear-to-b from-[#f0f0f0] from-40% to-[rgba(240,240,240,0)] md:block"
      />
      <div className={FOOD_DETAIL_LAYOUT.grid}>
        {/* At most the height between the screen's top and bottom padding
            (sticky offsets count from inside that padding). The photo gives
            way first; the name and description take up to 60% of it and
            scroll beyond that, so the photo keeps a usable size. */}
        <section className={FOOD_DETAIL_LAYOUT.photoCard}>
          <DishPhoto
            src={food.imageUrl ?? capturedPhotoUrl ?? null}
            className={FOOD_DETAIL_LAYOUT.photo}
          />
          <div className={FOOD_DETAIL_LAYOUT.photoText}>
            <h1 className={FOOD_DETAIL_LAYOUT.name}>
              {name}
              {thaiName && ` (${thaiName})`}
            </h1>
            {description && (
              <p className="mt-1.5 text-sm leading-5 tracking-[-0.28px] text-[#6a6a6a] md:mt-4 md:max-w-[456px] md:text-2xl md:leading-8 md:tracking-[-0.48px]">
                {description}
              </p>
            )}
          </div>
        </section>

        <div className={FOOD_DETAIL_LAYOUT.cards}>
          <InfoCard
            icon="/images/icons/food/shield.svg"
            title={t("capture.result.ingredientsSafety")}
            className="md:order-[-2]"
          >
            {matched.length > 0 && (
              <p role="alert" className="sr-only">
                {t("capture.result.allergyWarning")}:{" "}
                {new Intl.ListFormat(lang).format(matched.map(allergenLabel))}
              </p>
            )}

            <div className="rounded-2xl bg-[#f4f4f4] p-4 md:rounded-[23px] md:p-[25px]">
              <h3 className="text-lg leading-[19.6px] font-bold text-[#c82323] uppercase md:text-[26.2px] md:leading-[28.5px]">
                {t("capture.result.allergensDetected")}
              </h3>
              {allergens.length > 0 ? (
                <>
                  <ul className="mt-2 flex flex-col gap-[5px] text-base font-medium text-[#564334] md:mt-3 md:gap-2 md:text-xl">
                    <li className="flex items-center gap-1 md:gap-2">
                      <span aria-hidden="true" className="size-3.5 rounded-full bg-[#c82323] md:size-[18px]" />
                      {t("capture.result.yourAllergy")}
                    </li>
                    <li className="flex items-center gap-1 md:gap-2">
                      <span aria-hidden="true" className="size-3.5 rounded-full bg-[#f0a80d] md:size-[18px]" />
                      {t("capture.result.otherAllergen")}
                    </li>
                  </ul>
                  <ul className="mt-3.5 grid grid-cols-2 gap-3 md:mt-5 md:gap-[17.5px]">
                    {allergens.map((allergen) => {
                      const id = toAllergenId(allergen);
                      return (
                        <li
                          key={allergen}
                          className={`flex h-[55px] items-center gap-1 rounded-2xl pl-3 pr-2 text-base font-medium text-white shadow-[0_2px_2px_rgba(86,67,52,0.2)] md:h-20 md:gap-2 md:rounded-[23px] md:pl-[18px] md:text-[23.3px] ${
                            matched.includes(allergen) ? "bg-[#c82323]" : "bg-[#f0a80d]"
                          }`}
                        >
                          {id && <AllergenCardIcon id={id} className="size-10 md:size-[58px]" />}
                          <span className="min-w-0 break-words">{allergenLabel(allergen)}</span>
                        </li>
                      );
                    })}
                    {/* Keeps the last row full, as in the design. */}
                    {allergens.length % 2 === 1 && (
                      <li aria-hidden="true" className="h-[55px] rounded-2xl bg-[#dbdbdb] md:h-20 md:rounded-[23px]" />
                    )}
                  </ul>
                  {hasSelection && matched.length === 0 && (
                    <p className="mt-3 text-sm text-[#564334] md:text-lg">
                      {t("capture.result.allergyNoMatch")}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-[#564334] md:text-lg">
                  {t("capture.result.allergyNoData")}
                </p>
              )}
              <p className="mt-3 text-xs text-[#6a6a6a] md:text-base">
                {t("capture.result.allergyCheckNote")}
              </p>
            </div>

            {ingredients.length > 0 && (
              <div className="mt-4 px-[3px] md:mt-6 md:px-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-[14.4px] font-bold text-[#564334] uppercase md:text-[26.2px] md:leading-[21px]">
                    {t("capture.result.ingredients")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIngredientsOpen((open) => !open)}
                    aria-expanded={ingredientsOpen}
                    aria-label={t("capture.result.ingredients")}
                    className="-m-2 p-2 text-[#ff8500]"
                  >
                    <ChevronUp
                      aria-hidden="true"
                      strokeWidth={3}
                      className={`size-4 transition-transform md:size-6 ${ingredientsOpen ? "" : "rotate-180"}`}
                    />
                  </button>
                </div>
                {ingredientsOpen && (
                  <ul className="mt-3 flex flex-wrap gap-x-1.5 gap-y-2 md:mt-4 md:gap-x-2 md:gap-y-3">
                    {ingredients.map((ingredient) => (
                      <li key={ingredient}>
                        <button
                          type="button"
                          onClick={() => setOpenIngredient(ingredient)}
                          className={`${CHIP_CLASS} cursor-pointer transition-colors hover:bg-[#e8e8e8]`}
                        >
                          {ingredient}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {country && (
              <div className="mt-5 flex items-center justify-between gap-3 pl-[5px] md:mt-7 md:pl-[7px]">
                <h3 className="text-lg leading-[14.4px] font-bold text-[#564334] uppercase md:text-[26.2px] md:leading-[21px]">
                  {t("capture.result.country")}
                </h3>
                <span className="rounded-full border border-[#564334] bg-white px-[13px] pb-0.5 pt-1 text-sm leading-[14.4px] font-medium text-[#564334] md:border-[1.5px] md:px-[19px] md:pb-[3px] md:pt-1.5 md:text-[20.4px] md:leading-[21px]">
                  {country}
                </span>
              </div>
            )}
          </InfoCard>

          {food.spicyLevel && (
            <InfoCard icon="/images/icons/food/fire.svg" title={t("capture.result.spicyLevel")}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pl-[11px] md:gap-x-9 md:pl-4">
                <div aria-hidden="true" className="flex gap-[30px] md:gap-[43.7px]">
                  {[0, 1, 2].map((index) => (
                    <Image
                      key={index}
                      src={`/images/icons/food/${index < CHILIES[food.spicyLevel!] ? "chili-on" : "chili-off"}.svg`}
                      alt=""
                      width={27}
                      height={30}
                      className="h-[30px] w-[27px] md:h-[43.5px] md:w-[39.5px]"
                    />
                  ))}
                </div>
                <span className="rounded-full bg-[#fff8e1] px-[15px] py-1 text-base leading-[31.2px] font-medium text-[#564334] md:px-[22px] md:py-1.5 md:text-[23.3px] md:leading-[45.4px]">
                  {t(`capture.result.spicy.${spicyLevelKey(food.spicyLevel)}`)}
                </span>
              </div>
            </InfoCard>
          )}

          {audiencePills.length > 0 && (
            <InfoCard icon="/images/icons/food/user-tick.svg" title={t("capture.result.suitableFor")}>
              {/* Two equal columns even for a single pill, so "Adult" keeps
                  its place and size whether or not "Child" follows it. Both
                  groups share one gray style (Figma: Frame 52). */}
              <ul className="grid grid-cols-2 gap-4 px-4 md:grid-cols-[repeat(2,minmax(0,218px))] md:gap-[9.5px] md:px-0">
                {audiencePills.map(({ group, label }) => (
                  <li
                    key={group}
                    className="flex h-[34px] items-center justify-center rounded-[10px] bg-[#ebebeb] px-2 text-center text-sm font-medium tracking-[-0.28px] text-[#564334] md:h-[43px] md:text-[22px] md:tracking-normal"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </InfoCard>
          )}

          {howToEat && (
            <InfoCard icon="/images/icons/food/dining.svg" title={t("capture.result.howToEat")}>
              <p className="px-[5px] text-sm leading-5 tracking-[-0.28px] text-[#6a6a6a] md:px-2 md:text-[20.4px] md:leading-[29px] md:tracking-[-0.41px]">
                {howToEat}
              </p>
            </InfoCard>
          )}

          {hasNutrition && (
            <InfoCard
              icon="/images/icons/food/chart.svg"
              title={t("capture.result.nutrition")}
              className="md:order-[-1]"
            >
              {/* The values are per serving and estimated (the database
                  stores ranges), so the card says so under its title. */}
              <p className="-mt-1 mb-3 text-xs text-[#6a6a6a] md:-mt-2 md:mb-4 md:text-base">
                {t("capture.result.nutritionNote")}
              </p>
              <dl className="grid grid-cols-4 gap-1.5 md:gap-2">
                {nutrition.map((item) => (
                  <div
                    key={item.label}
                    className="flex h-[85px] flex-col items-center justify-center gap-1 rounded-2xl bg-[#f4f4f4] text-[#564334] md:h-[124px] md:gap-2 md:rounded-[23px]"
                  >
                    <dt className="text-sm uppercase md:text-[20.4px]">{item.label}</dt>
                    {/* A range ("350–450") is wider than the single numbers
                        the design shows, so it is set smaller and the unit
                        wraps under it when the tile is too narrow. */}
                    <dd className="flex flex-wrap items-baseline justify-center gap-x-1 px-1 text-center">
                      <span
                        className={`font-medium text-[#422f11] ${
                          item.value?.includes("–")
                            ? "text-base tracking-[-0.5px] md:text-[23px] md:tracking-[-1px]"
                            : "text-xl tracking-[-1px] md:text-[29px] md:tracking-[-1.45px]"
                        }`}
                      >
                        {item.value ?? "—"}
                      </span>
                      {item.value !== null && (
                        <span className={`font-bold ${item.unit === "kcal" ? "text-xs md:text-[17.5px]" : "text-sm md:text-[20.4px]"}`}>
                          {item.unit}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </InfoCard>
          )}

          {food.sourceUrl && (
            <InfoCard icon="/images/icons/food/link.svg" title={t("capture.result.moreInformation")}>
              <a
                href={food.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-auto flex h-[38px] w-full max-w-[279px] items-center justify-center gap-2 rounded-full border border-[#564334] bg-white px-6 text-sm font-medium tracking-[-0.28px] text-[#564334] transition-colors hover:bg-[#f4f4f4] md:mx-1.5 md:h-[68px] md:w-auto md:max-w-none md:gap-3 md:text-[17.5px] md:tracking-[-0.35px]"
              >
                {t("capture.result.openSource")}
                <Image
                  src="/images/icons/food/arrow-up-right.svg"
                  alt=""
                  width={12}
                  height={12}
                  className="size-3"
                />
              </a>
            </InfoCard>
          )}

          <div className="mt-[18px] flex justify-center gap-[9px] md:mt-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-[78px] items-center justify-center gap-2 rounded-full bg-[#b5b5b5] px-[30px] text-xl font-bold tracking-[-0.4px] text-white transition-opacity hover:opacity-85"
              >
                <Image src="/images/icons/chevron-left.svg" alt="" width={24} height={24} className="size-6" />
                {t("capture.result.back")}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push(`/${lang}`)}
              className="flex h-[78px] w-[189px] items-center justify-center rounded-full bg-[#ff8500] text-xl font-bold tracking-[-0.4px] text-white transition-opacity hover:opacity-90"
            >
              {t("capture.result.home")}
            </button>
          </div>
        </div>
      </div>

      {openIngredient && (
        <IngredientDetailModal
          key={openIngredient}
          ingredient={openIngredient}
          onClose={() => setOpenIngredient(null)}
        />
      )}
    </div>
  );
}
