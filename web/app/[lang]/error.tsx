"use client";

import { useEffect } from "react";

import { ErrorView, useErrorActions } from "@/components/error/ErrorView";
import { useT } from "@/lib/i18n/useT";

/** Unexpected runtime errors in a page under /[lang]. The language layout
 *  (header, translations) stays in place around it. */
export default function LangError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useT();
  const { back } = useErrorActions();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorView
      code="500"
      title={t("errorPage.unexpected.title")}
      message={t("errorPage.unexpected.message")}
      back={back}
      primary={{ label: t("errorPage.retry"), onClick: retry }}
    />
  );
}
