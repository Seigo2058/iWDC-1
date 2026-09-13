"use client";

import { useRouter } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/locales";

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
  const router = useRouter();

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
              if (!isActive) router.push(`/${locale}`);
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
