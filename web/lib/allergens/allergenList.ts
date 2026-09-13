/** Categories and items are defined in allergy-selection.md 4 (20 items,
 *  finalized list and grouping). Category/item labels live in the locale
 *  files under `allergies.categories` / `allergies.items`, keyed by id. */

export type AllergenCategory =
  | "seafood"
  | "meat"
  | "eggDairy"
  | "fruit"
  | "nutsLegumes"
  | "vegetable"
  | "other";

export const ALLERGEN_CATEGORIES: readonly AllergenCategory[] = [
  "seafood",
  "meat",
  "eggDairy",
  "fruit",
  "nutsLegumes",
  "vegetable",
  "other",
];

export interface AllergenItem {
  id: string;
  category: AllergenCategory;
}

export const ALLERGEN_ITEMS: readonly AllergenItem[] = [
  { id: "shrimp", category: "seafood" },
  { id: "abalone", category: "seafood" },
  { id: "crab", category: "seafood" },
  { id: "fish", category: "seafood" },
  { id: "beef", category: "meat" },
  { id: "chicken", category: "meat" },
  { id: "egg", category: "eggDairy" },
  { id: "milk", category: "eggDairy" },
  { id: "apple", category: "fruit" },
  { id: "banana", category: "fruit" },
  { id: "kiwi", category: "fruit" },
  { id: "treeNuts", category: "nutsLegumes" },
  { id: "peanuts", category: "nutsLegumes" },
  { id: "lupine", category: "nutsLegumes" },
  { id: "soy", category: "nutsLegumes" },
  { id: "celery", category: "vegetable" },
  { id: "mushroom", category: "vegetable" },
  { id: "gluten", category: "other" },
  { id: "gelatin", category: "other" },
];

export function itemsByCategory(
  category: AllergenCategory,
): readonly AllergenItem[] {
  return ALLERGEN_ITEMS.filter((item) => item.category === category);
}
