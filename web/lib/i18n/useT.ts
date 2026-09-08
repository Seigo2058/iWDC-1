import { useMemo } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import i18n from "@/i18n";

/**
 * Returns a translation function bound to the route's `[lang]` segment via
 * `getFixedT`, rather than the mutable global `i18n.language`. This keeps
 * server-rendered output correct per request without racing other
 * concurrent requests on the shared i18next singleton.
 */
export function useT() {
  const lang = useLang();
  return useMemo(() => i18n.getFixedT(lang, "common"), [lang]);
}
