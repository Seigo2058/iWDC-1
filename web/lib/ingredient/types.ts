export interface IngredientDetail {
  whatIsIt: string;
  /** Null when the AI left it out; the "made of" section is then hidden
   *  rather than treated as a failure (ingredient-detail.md 5.2). */
  madeOf: string | null;
}

/** `busy` / `quota`: the backend's 503 / 429, as for analysis
 *  (AnalyzeFailureReason). */
export type IngredientDetailFailureReason =
  | "network"
  | "timeout"
  | "config"
  | "busy"
  | "quota"
  | "server";

export type IngredientDetailResult =
  | { outcome: "success"; detail: IngredientDetail }
  | { outcome: "error"; reason: IngredientDetailFailureReason };
