export const SUPPORTED_LOCALES = ["en", "ja", "th"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** The first supported language in an Accept-Language header
 *  ("ja-JP,ja;q=0.9,en;q=0.8" -> "ja"), else the default. */
export function localeFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  for (const part of acceptLanguage.split(",")) {
    const language = part.split(";")[0]!.trim().toLowerCase();
    const shortLocale = language.split("-")[0]!;
    if (isSupportedLocale(shortLocale)) return shortLocale;
  }

  return DEFAULT_LOCALE;
}
