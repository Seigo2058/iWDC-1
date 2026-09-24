"use client";

import Image from "next/image";
import { useState } from "react";

import { AllergenCardIcon } from "@/components/allergies/AllergenIcon";
import { FixedBottomBar } from "@/components/ui/FixedBottomBar";
import { ALLERGEN_CATEGORIES, itemsByCategory } from "@/lib/allergens/allergenList";
import { useT } from "@/lib/i18n/useT";

interface AllergySelectionFormProps {
  initialSelected: string[];
  onSave: (selected: string[]) => void;
  onBack: () => void;
  onSkip?: () => void;
}

// Background of the page, faded out over the cards scrolling under the
// sticky title (Figma: the gradient over the top of the grid).
const FADE = "from-[#f0f0f0] from-[73.6%] via-[rgba(240,240,240,0.59)] via-[87.4%] to-[rgba(240,240,240,0)]";

/** Shared allergy-picker UI (allergy-selection.md 7; Figma: phone
 *  "Allergies(3)" / PC "MacBook Pro 16' - 12"), used both as a capture flow
 *  step and as the standalone `/[lang]/allergies` edit page: allergen cards
 *  by category (red when selected) under a sticky title
 *  with Skip, and Back / Save fixed at the bottom. Storage and navigation are the caller's
 *  responsibility via `onSave` / `onBack` / `onSkip`. */
export function AllergySelectionForm({
  initialSelected,
  onSave,
  onBack,
  onSkip,
}: AllergySelectionFormProps) {
  const t = useT();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  );

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-[#f0f0f0] font-brand">
      <div className={`sticky top-(--site-header-height) z-10 flex items-start justify-between gap-3 bg-linear-to-b px-5 pb-2.5 pt-10 md:px-gutter md:pb-9 md:pt-[93px] ${FADE}`}>
        <div className="min-w-0">
          <h1 className="text-xl leading-[31.2px] font-medium text-[#422f11] md:text-[30px] md:leading-[58.6px]">
            {t("allergies.heading")}
          </h1>
          <p className="leading-[25.6px] text-[#564334] md:leading-[48px]">
            {t("allergies.description")}
          </p>
        </div>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-1 flex shrink-0 items-center gap-1 rounded-full border border-[#564334] bg-white/50 py-2.5 pl-4 pr-2.5 font-medium text-[#564334] backdrop-blur-[12px] transition-colors hover:bg-white/80 md:mt-6 md:gap-1.5 md:border-[1.5px] md:py-[15px] md:pl-6 md:pr-[15px] md:backdrop-blur-[18px]"
          >
            {t("allergies.skip")}
            <Image src="/images/icons/arrow-left-brown.svg" alt="" width={24} height={24} className="size-6 rotate-180 md:size-9" />
          </button>
        )}
      </div>

      {/* Categories, each a heading over a two-column grid of cards: one
          column of categories on phones and tablets, two from xl with a line
          between them (Figma: "Allergies(3)" / "MacBook Pro 16' - 12").
          Bottom padding keeps the last cards clear of the fixed buttons. */}
      <div className="relative grid gap-6 px-5 pb-[140px] pt-[19px] md:gap-16 md:px-gutter md:pb-[200px] md:pt-[5px] xl:grid-cols-2 xl:gap-x-[11.6%]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[200px] left-1/2 top-[5px] hidden w-px bg-[#d4d4d4] xl:block"
        />
        {ALLERGEN_CATEGORIES.map((category) => (
          <section key={category} aria-labelledby={`allergy-category-${category}`}>
            <h2
              id={`allergy-category-${category}`}
              className="text-xl leading-[31.2px] font-medium text-[#422f11] md:text-[34.2px] md:leading-[53.3px]"
            >
              {t(`allergies.categories.${category}`)}
            </h2>
            <ul className="mt-2 grid grid-cols-2 gap-2 md:mt-[17px] md:gap-[13.7px]">
              {itemsByCategory(category).map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-pressed={isSelected}
                      className={`flex size-full flex-col items-center justify-center rounded-[20px] border px-2 py-[21px] transition-colors md:border-[1.7px] md:py-9 ${
                        isSelected
                          ? "border-[#c82323] bg-[#c82323] text-white"
                          : "border-[rgba(86,67,52,0.16)] bg-white text-[#e98b00] hover:bg-[#fafafa]"
                      }`}
                    >
                      <AllergenCardIcon id={item.id} className="-mb-px size-[49px] md:-mb-[1.7px] md:size-[84px]" />
                      <span
                        className={`text-center text-base leading-[19.6px] font-medium tracking-[0.28px] md:text-[27.3px] md:leading-[33.5px] ${
                          isSelected ? "text-white" : "text-[#564334]"
                        }`}
                      >
                        {t(`allergies.items.${item.id}`)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <FixedBottomBar className="gap-[9px] pb-6 pt-11 md:gap-3 md:pb-10 md:pt-[66px]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[78px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#b5b5b5] px-[30px] text-xl font-bold tracking-[-0.4px] text-white transition-opacity hover:opacity-85 md:h-[120px] md:gap-3 md:px-[46px]"
        >
          <Image src="/images/icons/chevron-left.svg" alt="" width={24} height={24} className="size-6 md:size-[37px]" />
          {t("allergies.back")}
        </button>
        <button
          type="button"
          onClick={() => onSave(Array.from(selected))}
          className="flex h-[78px] w-[198px] min-w-0 items-center justify-center rounded-full bg-[#ff8500] px-6 text-xl font-bold tracking-[-0.4px] text-white transition-opacity hover:opacity-90 md:h-[120px] md:w-[305px] md:text-[30.8px] md:tracking-[-0.62px]"
        >
          {t("allergies.save")}
        </button>
      </FixedBottomBar>
    </div>
  );
}
