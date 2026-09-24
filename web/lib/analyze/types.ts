/** Language suffix used by the analyze-food API — note "jp", where the app's
 *  own locale code is "ja" (connect-aisystem.md 6). */
export type ApiLang = "en" | "jp" | "th";

export type SpicyLevel = "No Spicy" | "Low Spicy" | "Medium Spicy" | "Very Spicy";

export interface LocalizedText {
  en: string;
  th: string;
  jp: string;
}

export interface FoodData {
  foodId: number | null;
  nameEn: string;
  nameTh: string;
  nameJp: string;
  description: LocalizedText;
  ingredients: Record<ApiLang, string[]>;
  allergens: Record<ApiLang, string[]>;
  spicyLevel: SpicyLevel | null;
  /** Who the dish suits, as the database says it: "Adult", or "Both" for
   *  adults and children. */
  audience: string | null;
  /** The dish's country in English ("Thailand", "Japan"). */
  country: string | null;
  /** Per serving, as an estimate (connect-aisystem.md 3.3). kcal / grams,
   *  as display text: a range such as "350–450", or a single number. */
  calories: string | null;
  protein: string | null;
  carbs: string | null;
  fat: string | null;
  howToEat: LocalizedText;
  sourceUrl: string | null;
  /** Reference photo of the dish from the database, distinct from the
   *  user's own captured photo. */
  imageUrl: string | null;
}

/** `busy`: every AI model is overloaded right now (the backend's 503).
 *  `quota`: every AI model has used up its request limit (429). */
export type AnalyzeFailureReason =
  | "config"
  | "network"
  | "timeout"
  | "busy"
  | "quota"
  | "server";

export type AnalyzeResult =
  | { outcome: "success"; foods: FoodData[] }
  | { outcome: "notFound" }
  | { outcome: "error"; reason: AnalyzeFailureReason };
