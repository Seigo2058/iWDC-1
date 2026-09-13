/** Local Storage only — never sent to the server (allergy-selection.md 1, 3.3). */
const STORAGE_KEY = "allergySelection";

const EMPTY_SELECTION: string[] = [];

function parseSelection(raw: string | null): string[] {
  if (raw === null) return EMPTY_SELECTION;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : EMPTY_SELECTION;
  } catch {
    return EMPTY_SELECTION;
  }
}

/** Whether an allergy selection has ever been saved, regardless of whether it
 *  is empty. This is how "first time" is detected (allergy-selection.md 3.1,
 *  3.3) — an empty array still counts as "configured". */
export function hasStoredAllergySelection(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}

export function getStoredAllergySelection(): string[] {
  if (typeof window === "undefined") return EMPTY_SELECTION;
  return parseSelection(window.localStorage.getItem(STORAGE_KEY));
}

export function saveAllergySelection(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

let cachedRaw: string | null | undefined;
let cachedSelection: string[] = EMPTY_SELECTION;

/** Snapshot getter for `useSyncExternalStore` — cached by the raw string's
 *  identity so repeated calls return a stable array reference when storage
 *  hasn't actually changed, as `useSyncExternalStore` requires. */
export function getStoredAllergySelectionSnapshot(): string[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSelection = parseSelection(raw);
  }
  return cachedSelection;
}

export function getServerAllergySelectionSnapshot(): string[] {
  return EMPTY_SELECTION;
}

/** `storage` only fires for changes made in other tabs/windows, which is
 *  enough to satisfy `useSyncExternalStore`'s subscribe contract for this
 *  page's one-time initial read. */
export function subscribeAllergySelection(
  onStoreChange: () => void,
): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}
