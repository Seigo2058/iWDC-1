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
  spicyLevel: SpicyLevel | null;
  /** Per serving, as an estimate (connect-aisystem.md 3.3). kcal / grams. */
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  howToEat: LocalizedText;
  sourceUrl: string | null;
}

export type AnalyzeFailureReason = "config" | "network" | "timeout" | "server";

export type AnalyzeResult =
  | { outcome: "success"; food: FoodData }
  | { outcome: "notFound" }
  | { outcome: "error"; reason: AnalyzeFailureReason };
