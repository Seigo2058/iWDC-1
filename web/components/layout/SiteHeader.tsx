"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** Orange navigation bar on every screen (Figma: Navigation Bar): mascot
 *  linking home on the left, the ALLERQUAL wordmark centered, language menu
 *  on the right. A client component because the language can change in
 *  place (LanguageSwitcher), and the home link must follow it. */
export function SiteHeader() {
  const t = useT();
  const lang = useLang();
  const pathname = usePathname();
  const step = useCaptureStore((state) => state.step);

  // The capture flow's screens before the allergy step and result (camera,
  // photo check, crop, final confirmation) are full height on phones with
  // their own top row (CaptureScreen's phoneTopBar) and a way back, so the
  // bar steps aside there.
  const isFullScreenOnPhone =
    pathname === `/${lang}/capture` &&
    (step === "capture" || step === "review" || step === "crop" || step === "confirm");

  return (
    <header className={`bg-[#e98b00] px-gutter ${isFullScreenOnPhone ? "max-md:hidden" : ""}`}>
      <div className="relative flex h-(--site-header-height) items-center justify-between">
        <Link href={`/${lang}`} aria-label={t("nav.home")} className="shrink-0">
          <Image
            src="/images/brand/logo.svg"
            alt=""
            width={81}
            height={76}
            preload
            className="h-[47px] w-[50px] md:h-[76px] md:w-[81px]"
          />
        </Link>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <Image
            src="/images/brand/wordmark-sm.svg"
            alt="ALLERQUAL"
            width={151}
            height={20}
            preload
            className="h-5 w-[151px] md:hidden"
          />
          <Image
            src="/images/brand/wordmark-lg.svg"
            alt="ALLERQUAL"
            width={224}
            height={34}
            className="hidden h-[34px] w-[224px] md:block"
          />
        </div>

        <LanguageSwitcher />
      </div>
    </header>
  );
}
