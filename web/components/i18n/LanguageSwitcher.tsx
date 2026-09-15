"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/locales";

// Each language's own name in its own script, not translated — the point of
// a language switcher is that a reader who can't read the current locale
// can still recognize their own.
const LANGUAGE_LABELS: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  th: "ไทย",
};

// Short code shown on the button and after each name in the menu, as in the
// design — the country's (JP), not the language's (JA), matching the flag.
const DISPLAY_CODES: Record<Locale, string> = {
  en: "EN",
  ja: "JP",
  th: "TH",
};

/** Same page in another language: only the leading `/[lang]` segment of
 *  the path changes (e.g. /ja/foods/5 -> /th/foods/5). */
function pathInLocale(pathname: string, locale: Locale): string {
  const rest = pathname.split("/").slice(2).join("/");
  return rest ? `/${locale}/${rest}` : `/${locale}`;
}

/** "🌐 EN ▾" menu of the navigation bar (Figma: Navigation Bar). */
export function LanguageSwitcher() {
  const t = useT();
  const lang = useLang();
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const choose = (locale: Locale) => {
    setOpen(false);
    // Rewriting the URL in place (instead of navigating) keeps the current
    // screen mounted, so in-progress state such as unsaved checkboxes or the
    // capture flow survives; I18nProvider reads the new language from the
    // path. Replace rather than push, so Back leaves the page instead of
    // stepping through languages.
    if (locale !== lang) {
      window.history.replaceState(null, "", pathInLocale(pathname, locale));
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t("nav.language")}: ${LANGUAGE_LABELS[lang]}`}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 rounded-full py-2 font-brand text-base font-medium text-white md:gap-3 md:border-[1.5px] md:border-white md:px-2.5 md:text-2xl"
      >
        <Image src="/images/icons/globe-sm.svg" alt="" width={14} height={14} className="size-3.5 md:hidden" />
        <Image src="/images/icons/globe-lg.svg" alt="" width={26} height={26} className="hidden size-[26px] md:block" />
        <span>{DISPLAY_CODES[lang]}</span>
        <Image
          src="/images/icons/caret.svg"
          alt=""
          width={10}
          height={5}
          className={`h-[5px] w-2.5 transition-transform ${open ? "" : "-scale-y-100"}`}
        />
      </button>

      {/* Card of flag + name rows (Figma: Home). Hangs 14px below the
          navigation bar: this button is centered in the bar, so its own
          half height plus half the bar's reaches the bar's bottom edge. */}
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(50%+var(--site-header-height)/2+14px)] z-20 flex w-[170px] flex-col gap-[3px] rounded-[32px] bg-white px-[18px] py-[19.5px] font-brand shadow-[0_0_8px_rgba(0,0,0,0.32),0_1px_1px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.03),0_12px_32px_rgba(0,0,0,0.02)]"
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <li key={locale} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={locale === lang}
                onClick={() => choose(locale)}
                className="flex h-10 w-full items-center gap-2 rounded-2xl bg-[rgba(63,63,63,0.08)] pl-[11px] text-left text-xs font-medium whitespace-nowrap text-black transition-colors hover:bg-[rgba(63,63,63,0.16)]"
              >
                <span className="size-6 shrink-0 overflow-hidden rounded-full">
                  {/* object-cover: the Japanese flag's artwork is 3:2,
                      cropped to its center like the design's mask. */}
                  <Image
                    src={`/images/flags/${locale}.svg`}
                    alt=""
                    width={24}
                    height={24}
                    className="size-full object-cover"
                  />
                </span>
                {LANGUAGE_LABELS[locale]} ({DISPLAY_CODES[locale]})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
