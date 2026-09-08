"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Locale } from "@/lib/locales";

const LangContext = createContext<Locale | null>(null);

export function I18nProvider({
  lang,
  children,
}: {
  lang: Locale;
  children: ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Locale {
  const lang = useContext(LangContext);
  if (!lang) {
    throw new Error("useLang must be used within an I18nProvider");
  }
  return lang;
}
