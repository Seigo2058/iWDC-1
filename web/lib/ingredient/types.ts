export interface IngredientDetail {
  whatIsIt: string;
  /** Null when the AI left it out; the "made of" section is then hidden
   *  rather than treated as a failure (ingredient-detail.md 5.2). */
  madeOf: string | null;
}

export type IngredientDetailFailureReason =
  | "network"
  | "timeout"
  | "config"
  | "server";

export type IngredientDetailResult =
  | { outcome: "success"; detail: IngredientDetail }
  | { outcome: "error"; reason: IngredientDetailFailureReason };
