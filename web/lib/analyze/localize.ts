import type {
  ApiLang,
  FoodData,
  LocalizedText,
  SpicyLevel,
} from "@/lib/analyze/types";
import type { Locale } from "@/lib/locales";

/** The API's spicy levels carry spaces, so they are slugged before being used
 *  as i18n keys (`capture.result.spicy.*`). */
const SPICY_LEVEL_KEYS: Record<SpicyLevel, string> = {
  "No Spicy": "none",
  "Low Spicy": "low",
  "Medium Spicy": "medium",
  "Very Spicy": "very",
};

export function spicyLevelKey(level: SpicyLevel): string {
  return SPICY_LEVEL_KEYS[level];
}

export function toApiLang(lang: Locale): ApiLang {
  return lang === "ja" ? "jp" : lang;
}

/** English is the one language the API always fills in, so it backs the
 *  others up when a translation is missing. */
export function localizedText(text: LocalizedText, lang: Locale): string {
  return text[toApiLang(lang)] || text.en;
}

export function foodName(food: FoodData, lang: Locale): string {
  switch (toApiLang(lang)) {
    case "jp":
      return food.nameJp || food.nameEn;
    case "th":
      return food.nameTh || food.nameEn;
    default:
      return food.nameEn;
  }
}

/** The dish's name in its own country's language ("ส้มตำ" for a Thai dish,
 *  "ラーメン" for a Japanese one), for ordering it by name where it's from;
 *  null for countries whose language the database has no name in. A dish
 *  without a country is taken as Thai, the cuisine the database covers. */
export function localFoodName(food: FoodData): string | null {
  switch (food.country?.trim().toLowerCase() ?? "thailand") {
    case "thailand":
      return food.nameTh;
    case "japan":
      return food.nameJp;
    default:
      return null;
  }
}

export function foodIngredients(food: FoodData, lang: Locale): string[] {
  return localizedList(food.ingredients, lang);
}

function localizedList(
  list: Record<ApiLang, string[]>,
  lang: Locale,
): string[] {
  const localized = list[toApiLang(lang)];
  return localized.length > 0 ? localized : list.en;
}

export type AudienceGroup = "adult" | "child";

/** The groups the database's audience value covers ("Both" is adults and
 *  children), each shown as its own pill; null for a value the app doesn't
 *  know (shown as is). */
export function audienceGroups(audience: string): AudienceGroup[] | null {
  switch (audience.trim().toLowerCase()) {
    case "adult":
    case "adults":
      return ["adult"];
    case "both":
      return ["adult", "child"];
    case "child":
    case "children":
    case "kids":
      return ["child"];
    default:
      return null;
  }
}

// The database names countries in English; these are the ones it uses (and
// neighbors likely to follow), by ISO region code for Intl.DisplayNames.
const COUNTRY_CODES: Record<string, string> = {
  thailand: "TH",
  japan: "JP",
  china: "CN",
  korea: "KR",
  "south korea": "KR",
  vietnam: "VN",
  india: "IN",
  indonesia: "ID",
  malaysia: "MY",
  singapore: "SG",
  philippines: "PH",
};

/** The country in the display language ("Thailand" -> "タイ" / "ไทย"),
 *  or as stored when it isn't one of the known names. */
export function countryName(country: string, lang: Locale): string {
  const code = COUNTRY_CODES[country.trim().toLowerCase()];
  if (!code) return country;
  return new Intl.DisplayNames(lang, { type: "region" }).of(code) ?? country;
}
