"use client";

import { useRouter } from "next/navigation";

import { ErrorView } from "@/components/error/ErrorView";
import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import { useCaptureStore } from "@/lib/store/useCaptureStore";

/** The analysis found no dish in the photo. Back returns to cropping, as
 *  the message suggests; Home ends the capture session. */
export function NotFoundStep() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();

  const goToStep = useCaptureStore((state) => state.goToStep);
  const reset = useCaptureStore((state) => state.reset);

  return (
    <ErrorView
      // As in the design.
      code="403"
      title={t("capture.notFound.heading")}
      message={t("capture.notFound.message")}
      back={{ label: t("errorPage.back"), onClick: () => goToStep("crop") }}
      primary={{
        label: t("errorPage.home"),
        onClick: () => {
          reset();
          router.push(`/${lang}`);
        },
      }}
    />
  );
}
