"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  AllergenIcon,
  hasAllergenIcon,
} from "@/components/allergies/AllergenIcon";
import { useLang } from "@/components/i18n/I18nProvider";
import { ALLERGEN_ITEMS } from "@/lib/allergens/allergenList";
import {
  getStoredAllergySelectionSnapshot,
  subscribeAllergySelection,
} from "@/lib/allergens/storage";
import { useT } from "@/lib/i18n/useT";

// Icons shown before the rest collapse into a "+N" badge: two on phones and
// seven on PC, as in the designs.
const PHONE_ICONS = 2;
const PC_ICONS = 7;

// Unknown before hydration (Local Storage is client-only); rendering
// "Not set" there would flash for users who have allergies saved.
const getServerSnapshot = () => null;

function CountBadge({
  count,
  className,
}: {
  count: number;
  className: string;
}) {
  return (
    <span
      className={`h-4 min-w-6 items-center justify-center rounded-full bg-[#cbcbcb] px-1.5 text-[10px] leading-none text-white md:h-[37px] md:min-w-[46px] md:px-[9px] md:text-[22.6px] md:font-medium ${className}`}
    >
      +{count}
    </span>
  );
}

/** Home screen summary of the saved allergies with a shortcut to edit them
 *  (Figma: Home "My Allergies"). */
export function MyAllergiesCard() {
  const t = useT();
  const lang = useLang();
  const selection = useSyncExternalStore(
    subscribeAllergySelection,
    getStoredAllergySelectionSnapshot,
    getServerSnapshot,
  );

  // Selection list order, and only ids the app still knows (a stored id
  // from an older allergen list has no icon or label).
  const ids =
    selection === null
      ? null
      : ALLERGEN_ITEMS.map((item) => item.id).filter(
          (id) => selection.includes(id) && hasAllergenIcon(id),
        );

  return (
    <section className="flex h-[78px] items-center justify-between gap-3 rounded-[33px] bg-white pl-[30px] pr-[16px] shadow-[0_0_20px_rgba(0,0,0,0.08)] md:h-[221px] md:rounded-[40px] md:pl-[61px] md:pr-[11px] md:shadow-[0_0_10px_rgba(0,0,0,0.08)]">
      <h2 className="min-w-0 truncate text-base text-[#564334] md:text-[32px] md:font-medium">
        {t("home.myAllergies.title")}
      </h2>

      <div className="flex h-[37px] shrink-0 items-center gap-2 rounded-full bg-[#f1f1f1] pl-3 md:h-[84px] md:gap-[13.5px] md:pl-5">
        {ids !== null &&
          (ids.length === 0 ? (
            <span className="text-xs text-[#595959] md:text-[22.6px]">
              {t("home.myAllergies.notSet")}
            </span>
          ) : (
            <>
              <span className="sr-only">
                {new Intl.ListFormat(lang).format(
                  ids.map((id) => t(`allergies.items.${id}`)),
                )}
              </span>
              {ids.slice(0, PC_ICONS).map((id, index) => (
                <AllergenIcon
                  key={id}
                  id={id}
                  className={`size-6 md:size-[46px] ${index >= PHONE_ICONS ? "hidden md:block" : ""}`}
                />
              ))}
              {ids.length > PHONE_ICONS && (
                <CountBadge
                  count={ids.length - PHONE_ICONS}
                  className="flex md:hidden"
                />
              )}
              {ids.length > PC_ICONS && (
                <CountBadge
                  count={ids.length - PC_ICONS}
                  className="hidden md:flex"
                />
              )}
            </>
          ))}

        <Link
          href={`/${lang}/allergies`}
          className="flex h-full items-center gap-1 rounded-full bg-[#ff8500] px-[15px] text-[11px] text-white transition-opacity hover:opacity-90 md:gap-[7px] md:px-[34px] md:text-[24.9px] md:font-medium md:tracking-[-0.5px]"
        >
          <Image
            src="/images/icons/edit.svg"
            alt=""
            width={19}
            height={19}
            className="size-[9px] md:size-[18.5px]"
          />
          {t("home.myAllergies.edit")}
        </Link>
      </div>
    </section>
  );
}
