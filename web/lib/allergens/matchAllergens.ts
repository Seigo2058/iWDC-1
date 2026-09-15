import { ALLERGEN_ITEMS } from "@/lib/allergens/allergenList";

// food_items.allergens stores the same English ids as the allergy list
// ("shrimp", "treeNuts", ...); compared case-insensitively to be forgiving
// of how the data was entered.
const key = (value: string) => value.trim().toLowerCase();

const KNOWN_IDS = new Map(ALLERGEN_ITEMS.map((item) => [key(item.id), item.id]));

/** The allergy-list id for a database allergen, or null for a value the
 *  list doesn't know (shown as-is). */
export function toAllergenId(value: string): string | null {
  return KNOWN_IDS.get(key(value)) ?? null;
}

/** The dish's allergens that are in the user's saved selection. */
export function matchAllergens(
  dishAllergens: string[],
  selection: string[],
): string[] {
  const selected = new Set(selection.map(key));
  return dishAllergens.filter((allergen) => selected.has(key(allergen)));
}
