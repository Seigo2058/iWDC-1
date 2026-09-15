import { notFound } from "next/navigation";

import { I18nProvider } from "@/components/i18n/I18nProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SUPPORTED_LOCALES, isSupportedLocale } from "@/lib/locales";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  if (!isSupportedLocale(lang)) {
    notFound();
  }

  return (
    <I18nProvider lang={lang}>
      {/* On every screen, as its own row so it never covers page content. */}
      <SiteHeader />
      {children}
    </I18nProvider>
  );
}
