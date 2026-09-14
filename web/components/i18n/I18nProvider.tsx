"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

import { isSupportedLocale, type Locale } from "@/lib/locales";

const LangContext = createContext<Locale | null>(null);

/** The language comes from the URL's leading segment rather than only the
 *  server-rendered `lang`: LanguageSwitcher rewrites the URL in place with
 *  `history.replaceState` (which usePathname follows), so the page keeps its
 *  state instead of being remounted as a different route. */
export function I18nProvider({
  lang,
  children,
}: {
  lang: Locale;
  children: ReactNode;
}) {
  const segment = usePathname()?.split("/")[1];
  const current = segment && isSupportedLocale(segment) ? segment : lang;
  return <LangContext.Provider value={current}>{children}</LangContext.Provider>;
}

export function useLang(): Locale {
  const lang = useContext(LangContext);
  if (!lang) {
    throw new Error("useLang must be used within an I18nProvider");
  }
  return lang;
}
