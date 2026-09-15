"use client";

import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

import { DishPhoto } from "@/components/home/DishPhoto";
import { MultiDishIllustration } from "@/components/home/MultiDishIllustration";
import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { formatScannedAt } from "@/lib/recentScans/formatScannedAt";
import {
  getRecentScansSnapshot,
  getServerRecentScansSnapshot,
  recentScanFoodName,
  subscribeRecentScans,
} from "@/lib/recentScans/storage";

// Figma: Home (phone) / MacBook Pro 16" (md, 768px, and up) "Recent Scans" cards.
const CARD_CLASS =
  "flex w-60 shrink-0 snap-start flex-col gap-3.5 rounded-3xl border border-white/50 bg-white/70 p-[15px] pb-[18px] shadow-[0_0_20px_rgba(0,0,0,0.08)] backdrop-blur-[6px] md:w-[442px] md:gap-4 md:rounded-[44px] md:border-[1.8px] md:px-[49.5px] md:pb-[33px] md:pt-6 md:shadow-[0_0_37px_rgba(0,0,0,0.08)] md:backdrop-blur-[11px]";
const PHOTO_CLASS = "aspect-[209/122] w-full rounded-xl md:rounded-[22px]";

/** Home screen history of scans, newest on the left (recent-scans.md 4).
 *  A single-dish scan shows that dish; a multi-dish scan shows a dedicated
 *  illustration and "<first dish> and more". Rendered from Local Storage
 *  only; no API calls. */
export function RecentScans() {
  const t = useT();
  const lang = useLang();
  const scans = useSyncExternalStore(
    subscribeRecentScans,
    getRecentScansSnapshot,
    getServerRecentScansSnapshot,
  );

  // Relative days ("today", "2 days ago") are computed per render of the
  // home screen, which only happens on the client once `scans` is known.
  const now = new Date();

  return (
    <section className="flex flex-col gap-4 md:gap-[42px]">
      <h2 className="flex items-center gap-1.5 px-gutter text-[22px] text-[#564334] md:gap-[5px] md:text-[26px] md:font-medium">
        <Image src="/images/icons/clock-sm.svg" alt="" width={24} height={24} className="size-6 md:hidden" />
        <Image src="/images/icons/clock-lg.svg" alt="" width={44} height={44} className="hidden size-11 md:block" />
        {t("recentScans.heading")}
      </h2>

      <ScrollRow>
        {scans === null ? (
          // Before hydration Local Storage is unknown; a neutral placeholder
          // avoids flashing the empty state for users who have history.
          <li className={CARD_CLASS} aria-hidden="true">
            <div className={`${PHOTO_CLASS} animate-pulse bg-black/[.06]`} />
            <div className="h-[46px] md:h-[51px]" />
          </li>
        ) : scans.length === 0 ? (
          <li className={CARD_CLASS}>
            <div
              className={`${PHOTO_CLASS} flex items-center justify-center border-2 border-dashed border-black/[.12]`}
            >
              <UtensilsCrossed aria-hidden="true" size={32} className="text-[#c7c7c7]" />
            </div>
            <p className="text-sm text-[#564334] md:text-base">{t("recentScans.empty")}</p>
          </li>
        ) : (
          scans.map((scan) => {
            const [first] = scan.foods;
            const isGroup = scan.foods.length > 1;
            const firstName = recentScanFoodName(first, lang);
            return (
              <li key={scan.id} className="shrink-0 snap-start">
                <Link
                  href={
                    isGroup
                      ? `/${lang}/scans/${encodeURIComponent(scan.id)}`
                      : `/${lang}/foods/${first.foodId}`
                  }
                  className={`${CARD_CLASS} h-full transition-opacity hover:opacity-80`}
                >
                  {isGroup ? (
                    <MultiDishIllustration
                      label={t("recentScans.multipleDishes")}
                      // The square drawing centered in the wide photo slot;
                      // the background continues its backdrop to the edges.
                      className={`${PHOTO_CLASS} overflow-hidden bg-amber-50`}
                    />
                  ) : (
                    <DishPhoto src={first.imageUrl} className={PHOTO_CLASS} />
                  )}
                  <span className="flex flex-col gap-1.5 px-0.5 md:gap-0 md:px-0">
                    <span className="line-clamp-2 text-lg font-medium leading-[19.6px] tracking-[0.28px] text-[#422f11] md:text-xl md:leading-[25px] md:tracking-[0.52px] md:text-[#564334]">
                      {isGroup
                        ? t("recentScans.groupName", { name: firstName })
                        : firstName}
                    </span>
                    <span className="text-sm text-[#564334] md:text-base md:leading-[26px]">
                      {formatScannedAt(scan.scannedAt, lang, t, now)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ScrollRow>
    </section>
  );
}

/** The horizontally scrolling card row, bleeding to the screen edge, with
 *  the design's small scroll indicator centered below it. The indicator is
 *  decorative (the row itself is the scrollable element) and only shows
 *  when the cards overflow. */
function ScrollRow({ children }: { children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!list || !track || !thumb) return;

    // Written straight to the DOM: scroll events fire every frame, and
    // nothing else renders from these values.
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = list;
      const overflow = scrollWidth - clientWidth;
      track.style.visibility = overflow > 1 ? "visible" : "hidden";
      if (overflow <= 1) return;
      const trackWidth = track.clientWidth;
      const thumbWidth = Math.max(trackWidth * (clientWidth / scrollWidth), 12);
      const progress = Math.min(Math.max(scrollLeft / overflow, 0), 1);
      thumb.style.width = `${thumbWidth}px`;
      thumb.style.transform = `translateX(${progress * (trackWidth - thumbWidth)}px)`;
    };

    update();
    list.addEventListener("scroll", update, { passive: true });
    // Covers window resizes and cards being added or removed.
    const observer = new ResizeObserver(update);
    observer.observe(list);
    const mutations = new MutationObserver(update);
    mutations.observe(list, { childList: true });
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-8 md:gap-12 md:pb-24">
      <ul
        ref={listRef}
        // py-5/-my-5: room for the card shadows, which overflow-x would
        // otherwise clip, without changing the spacing of the design.
        className="-my-5 flex snap-x snap-mandatory gap-[17px] overflow-x-auto px-gutter py-5 [scrollbar-width:none] md:gap-9 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      <div
        ref={trackRef}
        aria-hidden="true"
        className="invisible h-[5px] w-[69px] self-center overflow-hidden rounded-full bg-[#c7c7c7] md:h-3 md:w-[408px]"
      >
        <div ref={thumbRef} className="h-full rounded-full bg-[#919191]" />
      </div>
    </div>
  );
}
