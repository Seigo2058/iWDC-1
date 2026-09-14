"use client";

import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { useLang } from "@/components/i18n/I18nProvider";
import { useT } from "@/lib/i18n/useT";
import type { Locale } from "@/lib/locales";
import { formatScannedAt } from "@/lib/recentScans/formatScannedAt";
import {
  getRecentScansSnapshot,
  getServerRecentScansSnapshot,
  subscribeRecentScans,
  type RecentScan,
} from "@/lib/recentScans/storage";

const CARD_CLASS = "flex w-36 shrink-0 snap-start flex-col gap-2";
const PHOTO_CLASS = "aspect-square w-full rounded-xl";

/** Home screen history of opened dishes, newest on the left
 *  (recent-scans.md 4). Rendered from Local Storage only; no API calls. */
export function RecentScans() {
  const t = useT();
  const lang = useLang();
  const scans = useSyncExternalStore(
    subscribeRecentScans,
    getRecentScansSnapshot,
    getServerRecentScansSnapshot,
  );

  // Relative days ("today", "2 days ago") are computed per render of the
  // home screen, which only happens on the client once `scans` is known.
  const now = new Date();

  return (
    <section className="flex w-full flex-col gap-3 pb-8">
      <h2 className="px-4 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        {t("recentScans.heading")}
      </h2>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {scans === null ? (
          // Before hydration Local Storage is unknown; a neutral placeholder
          // avoids flashing the empty state for users who have history.
          <li className={CARD_CLASS} aria-hidden="true">
            <div className={`${PHOTO_CLASS} animate-pulse bg-black/[.06] dark:bg-white/[.1]`} />
          </li>
        ) : scans.length === 0 ? (
          <li className={CARD_CLASS}>
            <div
              className={`${PHOTO_CLASS} flex items-center justify-center border-2 border-dashed border-black/[.12] dark:border-white/[.18]`}
            >
              <UtensilsCrossed aria-hidden="true" size={32} className="text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("recentScans.empty")}
            </p>
          </li>
        ) : (
          scans.map((scan) => (
            <li key={scan.foodId} className={CARD_CLASS}>
              <RecentScanCard
                scan={scan}
                lang={lang}
                scannedAtLabel={formatScannedAt(scan.scannedAt, lang, t, now)}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function scanName(scan: RecentScan, lang: Locale): string {
  if (lang === "ja") return scan.nameJp;
  if (lang === "th") return scan.nameTh;
  return scan.nameEn;
}

function RecentScanCard({
  scan,
  lang,
  scannedAtLabel,
}: {
  scan: RecentScan;
  lang: Locale;
  scannedAtLabel: string;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = scan.imageUrl !== null && !photoFailed;

  return (
    <Link
      href={`/${lang}/foods/${scan.foodId}`}
      className="flex flex-col gap-2 rounded-xl transition-opacity hover:opacity-80"
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- external URL from the database, not a local/static asset
        <img
          src={scan.imageUrl ?? undefined}
          alt=""
          onError={() => setPhotoFailed(true)}
          className={`${PHOTO_CLASS} bg-black/[.05] object-cover dark:bg-white/[.08]`}
        />
      ) : (
        <div
          className={`${PHOTO_CLASS} flex items-center justify-center bg-black/[.05] dark:bg-white/[.08]`}
        >
          <UtensilsCrossed aria-hidden="true" size={32} className="text-zinc-400" />
        </div>
      )}
      <span className="line-clamp-2 text-sm font-semibold">
        {scanName(scan, lang)}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {scannedAtLabel}
      </span>
    </Link>
  );
}
