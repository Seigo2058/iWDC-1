"use client";

import { ErrorView, useErrorActions } from "@/components/error/ErrorView";
import { useT } from "@/lib/i18n/useT";

/** 404 for a URL the app doesn't have (app/not-found.tsx and
 *  app/[lang]/not-found.tsx). */
export function PageNotFound() {
  const t = useT();
  const { back, home } = useErrorActions();
  return (
    <ErrorView
      code="404"
      title={t("errorPage.pageNotFound.title")}
      message={t("errorPage.pageNotFound.message")}
      back={back}
      primary={home}
    />
  );
}
