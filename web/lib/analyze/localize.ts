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

export function foodIngredients(food: FoodData, lang: Locale): string[] {
  return localizedList(food.ingredients, lang);
}

export function foodAllergens(food: FoodData, lang: Locale): string[] {
  return localizedList(food.allergens, lang);
}

function localizedList(
  list: Record<ApiLang, string[]>,
  lang: Locale,
): string[] {
  const localized = list[toApiLang(lang)];
  return localized.length > 0 ? localized : list.en;
}
