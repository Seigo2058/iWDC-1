import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_LOCALE, isSupportedLocale } from "./lib/locales";

function detectLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const preferredLanguages = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]!.trim().toLowerCase());

  for (const language of preferredLanguages) {
    const shortLocale = language.split("-")[0]!;
    if (isSupportedLocale(shortLocale)) {
      return shortLocale;
    }
  }

  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const locale = detectLocale(request);
  return NextResponse.redirect(new URL(`/${locale}`, request.url));
}

export const config = {
  matcher: "/",
};
