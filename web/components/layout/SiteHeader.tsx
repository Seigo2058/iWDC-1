"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** Orange navigation bar on every screen, pinned to the top while the page
 *  scrolls (Figma: Navigation Bar): the logo linking home on the left, the
 *  ALLERQUAL logotype centered, language menu on the right. A client
 *  component because the language can change in place (LanguageSwitcher),
 *  and the home link must follow it. */
export function SiteHeader() {
  const t = useT();
  const lang = useLang();
  const pathname = usePathname();
  const step = useCaptureStore((state) => state.step);

  // The capture flow's screens before the allergy step and result (camera,
  // photo check, crop, final confirmation) are full height on phones with
  // their own top row (CaptureScreen's topBar) and a way back, so the
  // bar steps aside there.
  const isFullScreenOnPhone =
    pathname === `/${lang}/capture` &&
    (step === "capture" || step === "review" || step === "crop" || step === "confirm");

  return (
    // Sticky rather than fixed: it keeps its place in the layout, so pages
    // need no top padding for it (and those sized as "the viewport minus
    // the header" stay right). Above FixedBottomBar and page content.
    <header
      className={`sticky top-0 z-30 bg-[#e98b00] px-gutter ${isFullScreenOnPhone ? "max-md:hidden" : ""}`}
    >
      <div className="relative flex h-(--site-header-height) items-center justify-between">
        <Link href={`/${lang}`} aria-label={t("nav.home")} className="shrink-0">
          <Image
            src="/images/header/logo.png"
            alt=""
            width={303}
            height={312}
            preload
            sizes="(min-width: 48rem) 74px, 46px"
            className="h-[47px] w-auto md:h-[76px]"
          />
        </Link>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          {/* White lettering with a check mark above it; as wide as the
              previous wordmark, so the lettering keeps about its size. */}
          <Image
            src="/images/header/logotype.png"
            alt="ALLERQUAL"
            width={1077}
            height={268}
            preload
            sizes="(min-width: 48rem) 224px, 151px"
            className="h-auto w-[151px] md:w-[224px]"
          />
        </div>

        <LanguageSwitcher />
      </div>
    </header>
  );
}
