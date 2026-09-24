"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { DishPhoto } from "@/components/home/DishPhoto";
import { FixedBottomBar } from "@/components/ui/FixedBottomBar";

export interface DishCardItem {
  key: string;
  name: string;
  /** Null for none; undefined while it is still loading (a placeholder). */
  description: string | null | undefined;
  imageUrl: string | null;
  /** A link to the dish page, or a callback (e.g. to open it in place). */
  href?: string;
  onSelect?: () => void;
}

const CARD_CLASS =
  "flex w-full items-center gap-[19px] rounded-3xl border border-[rgba(86,67,52,0.16)] bg-white p-[11px] pr-[29px] text-left transition-colors hover:bg-[#fafafa] md:gap-[30px] md:rounded-[32px] md:border-0 md:py-[25.5px] md:pl-[26px] md:pr-8 md:shadow-[0_0_16px_rgba(0,0,0,0.24)]";

function CardBody({ item }: { item: DishCardItem }) {
  return (
    <>
      <DishPhoto
        src={item.imageUrl}
        className="h-[129px] w-[135px] shrink-0 rounded-xl md:h-[226px] md:w-[237px]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xl font-medium break-words text-[#422f11] md:text-[22px]">
          {item.name}
        </span>
        {item.description === undefined ? (
          <span aria-hidden="true" className="flex flex-col gap-1.5 pt-1 md:max-w-[363px]">
            <span className="h-2.5 w-full animate-pulse rounded bg-black/[.06] md:h-3.5" />
            <span className="h-2.5 w-4/5 animate-pulse rounded bg-black/[.06] md:h-3.5" />
          </span>
        ) : (
          item.description && (
            <span className="line-clamp-4 text-xs leading-[1.3] tracking-[-0.24px] text-[#6a6a6a] md:max-w-[363px] md:text-base md:tracking-[-0.32px]">
              {item.description}
            </span>
          )
        )}
      </span>
    </>
  );
}

/** A page of dishes found in one photo (Figma: phone "Information" / PC
 *  "MacBook Pro 16' - 10"): a title with the count over photo + name +
 *  description cards (one column on phones, two on PC), each opening that
 *  dish, and Back fixed at the bottom. Used right after a scan (FoodList)
 *  and for a multi-dish scan from the history (ScanGroupView). */
export function DishCardList({
  title,
  meta,
  subtitle,
  items,
  backLabel,
  onBack,
}: {
  title: string;
  /** An extra line under the title (e.g. when the scan was made). */
  meta?: ReactNode;
  subtitle: string;
  items: DishCardItem[];
  backLabel: string;
  onBack: () => void;
}) {
  return (
    // Bottom padding keeps the last cards clear of the fixed Back button.
    <div className="flex flex-1 flex-col bg-[#f0f0f0] px-gutter pb-[140px] pt-10 font-brand md:pb-[200px] md:pt-[46px]">
      <h1 className="text-xl leading-[31.2px] font-medium text-[#422f11] md:text-[26px]">
        {title}
      </h1>
      {meta && <p className="text-sm text-[#6a6a6a] md:mt-1 md:text-lg">{meta}</p>}
      <p className="leading-[25.6px] text-[#564334] md:mt-1.5 md:text-xl">{subtitle}</p>

      <ul className="mt-[11px] grid gap-3 md:mt-[42px] md:grid-cols-2 md:gap-x-9 md:gap-y-[41px]">
        {items.map((item) => (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className={CARD_CLASS}>
                <CardBody item={item} />
              </Link>
            ) : (
              <button type="button" onClick={item.onSelect} className={CARD_CLASS}>
                <CardBody item={item} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* No fading band behind Back on phones (bg-none drops the gradient);
          the cards scroll under it against the page background. */}
      <FixedBottomBar className="pb-6 pt-11 max-md:bg-none md:pb-[54px] md:pt-[108px]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-[78px] w-[221px] items-center justify-center gap-2 rounded-full bg-[#b5b5b5] px-[30px] text-xl font-bold tracking-[-0.4px] text-white transition-opacity hover:opacity-85"
        >
          <Image src="/images/icons/chevron-left.svg" alt="" width={24} height={24} className="size-6" />
          {backLabel}
        </button>
      </FixedBottomBar>
    </div>
  );
}
