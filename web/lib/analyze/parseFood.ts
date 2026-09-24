import type {
  ApiLang,
  FoodData,
  LocalizedText,
  SpicyLevel,
} from "@/lib/analyze/types";

/** Parses one dish object in the shape shared by `/api/analyze-food`'s
 *  `data[]` and `/api/foods/{food_id}`'s `data`. Null when it lacks the
 *  English name the rest of the app relies on. */
export function toFoodData(value: unknown): FoodData | null {
  const raw = asRecord(value);
  const nameEn = asText(raw.name_en);
  if (!nameEn) return null;

  return {
    foodId: asNumber(raw.food_id),
    nameEn,
    nameTh: asText(raw.name_th) ?? nameEn,
    nameJp: asText(raw.name_jp) ?? nameEn,
    description: toLocalizedText(raw.description),
    ingredients: toLocalizedList(raw.ingredients),
    allergens: toLocalizedList(raw.allergens),
    spicyLevel: toSpicyLevel(raw.spicy_level),
    audience: asText(raw.audience),
    country: asText(raw.country),
    calories: asNutrient(raw.calories),
    protein: asNutrient(raw.protein),
    carbs: asNutrient(raw.carbs),
    fat: asNutrient(raw.fat),
    howToEat: toLocalizedText(raw.how_to_eat),
    sourceUrl: asText(raw.source_url),
    imageUrl: asText(raw.image_url),
  };
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Nutrition values are estimated ranges stored as text ("350 - 450");
 *  plain numbers are accepted too. Ranges are tightened to "350–450" so they
 *  fit the nutrition tiles. */
function asNutrient(value: unknown): string | null {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  const text = asText(value)?.trim();
  return text ? text.replace(/\s*[-–~〜]\s*/g, "–") : null;
}

function toLocalizedText(value: unknown): LocalizedText {
  const raw = asRecord(value);
  const en = asText(raw.en) ?? "";
  return { en, th: asText(raw.th) ?? en, jp: asText(raw.jp) ?? en };
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** `ingredients` was first specified as a flat English array and later as a
 *  per-language object (connect-aisystem.md 3.3), so both shapes are accepted.
 *  `allergens` follows the same per-language shape. */
function toLocalizedList(value: unknown): Record<ApiLang, string[]> {
  if (Array.isArray(value)) {
    const shared = toStringList(value);
    return { en: shared, th: shared, jp: shared };
  }

  const raw = asRecord(value);
  const en = toStringList(raw.en);
  const th = toStringList(raw.th);
  const jp = toStringList(raw.jp);
  return { en, th: th.length > 0 ? th : en, jp: jp.length > 0 ? jp : en };
}

const SPICY_LEVELS: SpicyLevel[] = [
  "No Spicy",
  "Low Spicy",
  "Medium Spicy",
  "Very Spicy",
];

function toSpicyLevel(value: unknown): SpicyLevel | null {
  return SPICY_LEVELS.find((level) => level === value) ?? null;
}
