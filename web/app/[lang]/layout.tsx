import { notFound } from "next/navigation";

import { I18nProvider } from "@/components/i18n/I18nProvider";
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

  return <I18nProvider lang={lang}>{children}</I18nProvider>;
}
