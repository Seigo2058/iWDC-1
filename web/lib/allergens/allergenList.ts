/** Categories and items are defined in allergy-selection.md 4 (21 items in
 *  8 categories, as in the Figma allergy screen "Allergies(3)"). Category/item labels live in the locale
 *  files under `allergies.categories` / `allergies.items`, keyed by id. */

export type AllergenCategory =
  | "seafood"
  | "meat"
  | "eggDairy"
  | "fruit"
  | "nutsLegumes"
  | "vegetable"
  | "other"
  | "religion";

export const ALLERGEN_CATEGORIES: readonly AllergenCategory[] = [
  "seafood",
  "meat",
  "eggDairy",
  "fruit",
  "nutsLegumes",
  "vegetable",
  "other",
  "religion",
];

export interface AllergenItem {
  id: string;
  category: AllergenCategory;
}

export const ALLERGEN_ITEMS: readonly AllergenItem[] = [
  { id: "shrimp", category: "seafood" },
  { id: "shellfish", category: "seafood" },
  { id: "crab", category: "seafood" },
  { id: "fish", category: "seafood" },
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
  { id: "mushroom", category: "vegetable" },
  { id: "celery", category: "vegetable" },
  { id: "gluten", category: "other" },
  { id: "gelatin", category: "other" },
  // Dietary restrictions for religious reasons, picked like allergies.
  { id: "beef", category: "religion" },
  { id: "pork", category: "religion" },
  { id: "alcohol", category: "religion" },
];

export function itemsByCategory(
  category: AllergenCategory,
): readonly AllergenItem[] {
  return ALLERGEN_ITEMS.filter((item) => item.category === category);
}
