"use client";

import { usePathname } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/locales";

/** Same page in another language: only the leading `/[lang]` segment of
 *  the path changes (e.g. /ja/foods/5 -> /th/foods/5). */
function pathInLocale(pathname: string, locale: Locale): string {
  const rest = pathname.split("/").slice(2).join("/");
  return rest ? `/${locale}/${rest}` : `/${locale}`;
}

// Each language's own name in its own script, not translated — the point of
// a language switcher is that a reader who can't read the current locale
// can still recognize their own.
const LANGUAGE_LABELS: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  th: "ไทย",
};

export function LanguageSwitcher() {
  const lang = useLang();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center gap-1 rounded-full bg-black/[.05] p-1 dark:bg-white/[.08]"
    >
      {SUPPORTED_LOCALES.map((locale) => {
        const isActive = locale === lang;
        return (
          <button
            key={locale}
            type="button"
            aria-current={isActive ? "true" : undefined}
            onClick={() => {
              // Rewriting the URL in place (instead of navigating) keeps the
              // current screen mounted, so in-progress state such as unsaved
              // checkboxes or the capture flow survives; I18nProvider reads
              // the new language from the path. Replace rather than push, so
              // Back leaves the page instead of stepping through languages.
              if (!isActive) {
                window.history.replaceState(null, "", pathInLocale(pathname, locale));
              }
            }}
            className={
              isActive
                ? "rounded-full bg-foreground px-3 py-1 text-sm font-medium text-background"
                : "rounded-full px-3 py-1 text-sm text-zinc-600 transition-colors hover:bg-black/[.05] dark:text-zinc-400 dark:hover:bg-white/[.08]"
            }
          >
            {LANGUAGE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}
