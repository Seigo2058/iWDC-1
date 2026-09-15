import type { useT } from "@/lib/i18n/useT";
import type { Locale } from "@/lib/locales";

type TFunction = ReturnType<typeof useT>;

const DAY_MS = 24 * 60 * 60 * 1000;

// recent-scans.md 4.3. ja: 午前09:05 (h11 so noon is 午後00:30);
// en: 9:05 AM; th: 24-hour 09:05 น., since th-TH's 12-hour form falls back
// to English AM/PM.
const TIME_FORMATS: Record<Locale, Intl.DateTimeFormat> = {
  ja: new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h11",
  }),
  en: new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }),
  th: new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }),
};

/** Whole calendar days between the two dates in the device's time zone, not
 *  24-hour periods (23:50 yesterday is "yesterday" at 00:10 today). */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const start = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const end = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  // Rounding absorbs the 23/25-hour days around DST changes.
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/** e.g. "今日 午前09:05", "3 days ago, 12:30 PM", "เมื่อวาน 21:45 น." */
export function formatScannedAt(
  scannedAt: string,
  lang: Locale,
  t: TFunction,
  now: Date,
): string {
  const date = new Date(scannedAt);
  // A clock that ran ahead can leave a future timestamp; show it as today.
  const days = Math.max(0, calendarDaysBetween(date, now));

  const day =
    days === 0
      ? t("recentScans.today")
      : days === 1
        ? t("recentScans.yesterday")
        : t("recentScans.daysAgo", { count: days });

  const time = TIME_FORMATS[lang].format(date);
  // English separates the day and time with a comma ("Today, 9:30 AM",
  // Figma: Home).
  if (lang === "en") return `${day}, ${time}`;
  return `${day} ${lang === "th" ? `${time} น.` : time}`;
}
