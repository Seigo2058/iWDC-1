"use client";

import { useRouter } from "next/navigation";

import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";

export function AllergySettingsLink() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/${lang}/allergies`)}
      className="text-sm text-zinc-600 underline dark:text-zinc-400"
    >
      {t("allergies.settingsLink")}
    </button>
  );
}
