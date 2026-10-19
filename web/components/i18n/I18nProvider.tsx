"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { isSupportedLocale, pathInLocale, type Locale } from "@/lib/locales";

const LangContext = createContext<Locale | null>(null);

// The language last shown in this tab. sessionStorage rather than
// localStorage: it lives as long as the tab's history it guards.
const STORAGE_KEY = "lang";

function readShownLang(): Locale | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value && isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function writeShownLang(lang: Locale) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage unavailable (e.g. blocked): Back may then restore the old language.
  }
}

/** History entries keep the language they were visited in, since
 *  LanguageSwitcher can only rewrite the current one. When Back/Forward
 *  (the browser's, or a screen's `router.back()`) lands on an entry in
 *  another language than the one last shown, rewrite it to that one. */
function keepShownLang(shown: Locale | null) {
  const { pathname, search, hash } = window.location;
  const segment = pathname.split("/")[1];
  if (!shown || !segment || !isSupportedLocale(segment) || segment === shown) {
    return;
  }
  window.history.replaceState(null, "", `${pathInLocale(pathname, shown)}${search}${hash}`);
}

function keepShownLangOnTraversal() {
  keepShownLang(readShownLang());
}

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

  useEffect(() => {
    // A full page load from Back/Forward (e.g. after a reload) gets no
    // popstate, so check once on mount too.
    // Read before the effect below records this page's language, and apply
    // after Next.js's router (whose effects run after ours) has hooked
    // `history.replaceState`, so usePathname follows the rewrite.
    const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (navigation?.type === "back_forward") {
      const shown = readShownLang();
      timer = setTimeout(() => keepShownLang(shown));
    }

    // Runs before React renders the restored entry, so the old language
    // never shows.
    window.addEventListener("popstate", keepShownLangOnTraversal);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", keepShownLangOnTraversal);
    };
  }, []);

  useEffect(() => {
    writeShownLang(current);
  }, [current]);

  return <LangContext.Provider value={current}>{children}</LangContext.Provider>;
}

export function useLang(): Locale {
  const lang = useContext(LangContext);
  if (!lang) {
    throw new Error("useLang must be used within an I18nProvider");
  }
  return lang;
}
