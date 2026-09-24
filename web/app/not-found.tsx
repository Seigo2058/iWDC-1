import { headers } from "next/headers";

import { PageNotFound } from "@/components/error/PageNotFound";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { localeFromAcceptLanguage } from "@/lib/locales";

/** 404 outside any language: the URL's first segment isn't a supported
 *  language (e.g. /xx/foods/1), so [lang]/layout calls notFound() before
 *  its own not-found can render. Shown in the browser's language, with the
 *  same header as every other screen. */
export default async function RootNotFound() {
  const lang = localeFromAcceptLanguage((await headers()).get("accept-language"));
  return (
    <I18nProvider lang={lang}>
      <SiteHeader />
      <PageNotFound />
    </I18nProvider>
  );
}
