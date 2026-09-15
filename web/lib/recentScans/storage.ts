import type { FoodData } from "@/lib/analyze/types";
import type { Locale } from "@/lib/locales";

/** Local Storage only — never sent to the server (recent-scans.md 1, 3.4). */
const STORAGE_KEY = "recentScans";
const MAX_SCANS = 20;
// `storage` only fires in other tabs; this also notifies the current one.
const CHANGE_EVENT = "recentscans-change";

/** A dish as it was at scan time (recent-scans.md 3.2). */
export interface RecentScanFood {
  foodId: number;
  nameEn: string;
  nameTh: string;
  nameJp: string;
  imageUrl: string | null;
}

/** One scan: every dish its analysis found, saved together. */
export interface RecentScan {
  id: string;
  scannedAt: string;
  foods: RecentScanFood[];
}

const EMPTY: RecentScan[] = [];

export function recentScanFoodName(food: RecentScanFood, lang: Locale): string {
  if (lang === "ja") return food.nameJp;
  if (lang === "th") return food.nameTh;
  return food.nameEn;
}

function parse(raw: string | null): RecentScan[] {
  if (raw === null) return EMPTY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!Array.isArray(parsed)) return EMPTY;
  return parsed.flatMap((item) => {
    const scan = toRecentScan(item);
    return scan ? [scan] : [];
  });
}

function toRecentScan(value: unknown): RecentScan | null {
  const raw = asRecord(value);
  const scannedAt = typeof raw.scannedAt === "string" ? raw.scannedAt : null;
  if (!scannedAt || Number.isNaN(Date.parse(scannedAt))) return null;

  // History saved before scans were grouped holds one dish per entry; it is
  // read as a single-dish scan so existing history isn't lost.
  if (!Array.isArray(raw.foods)) {
    const food = toRecentScanFood(raw);
    return food
      ? { id: `legacy-${food.foodId}-${scannedAt}`, scannedAt, foods: [food] }
      : null;
  }

  const id = text(raw.id);
  const foods = raw.foods.flatMap((item) => {
    const food = toRecentScanFood(asRecord(item));
    return food ? [food] : [];
  });
  return id && foods.length > 0 ? { id, scannedAt, foods } : null;
}

function toRecentScanFood(raw: Record<string, unknown>): RecentScanFood | null {
  const nameEn = text(raw.nameEn);
  if (!Number.isInteger(raw.foodId) || !nameEn) return null;
  return {
    foodId: raw.foodId as number,
    nameEn,
    nameTh: text(raw.nameTh) ?? nameEn,
    nameJp: text(raw.nameJp) ?? nameEn,
    imageUrl: text(raw.imageUrl),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function read(): RecentScan[] {
  return parse(window.localStorage.getItem(STORAGE_KEY));
}

function write(scans: RecentScan[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function newScanId(): string {
  // Not crypto.randomUUID: it is missing outside secure contexts (e.g. a
  // phone opening the dev server by LAN address), and uniqueness within
  // one device's history is all that's needed.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Records one scan's dishes together at the front (recent-scans.md 3.1,
 *  3.3). Re-scanning the same single dish replaces its older single-dish
 *  entry; multi-dish scans are always kept as their own entry. */
export function saveRecentScan(foods: FoodData[], scannedAt: string): void {
  if (typeof window === "undefined") return;

  const scanFoods = foods.flatMap((food): RecentScanFood[] =>
    food.foodId === null
      ? []
      : [
          {
            foodId: food.foodId,
            nameEn: food.nameEn,
            nameTh: food.nameTh,
            nameJp: food.nameJp,
            imageUrl: food.imageUrl,
          },
        ],
  );
  if (scanFoods.length === 0) return;

  const single = scanFoods.length === 1 ? scanFoods[0].foodId : null;
  const others = read().filter(
    (scan) =>
      single === null ||
      scan.foods.length !== 1 ||
      scan.foods[0].foodId !== single,
  );
  const entry: RecentScan = { id: newScanId(), scannedAt, foods: scanFoods };
  write([entry, ...others].slice(0, MAX_SCANS));
}

/** Drops a dish the database no longer has from every scan, and any scan
 *  left with no dishes (recent-scans.md 6.2). */
export function removeFoodFromRecentScans(foodId: number): void {
  if (typeof window === "undefined") return;
  const scans = read();
  const next = scans.flatMap((scan) => {
    const foods = scan.foods.filter((food) => food.foodId !== foodId);
    return foods.length > 0 ? [{ ...scan, foods }] : [];
  });
  const changed =
    next.length !== scans.length ||
    next.some((scan, index) => scan.foods.length !== scans[index].foods.length);
  if (changed) write(next);
}

let cachedRaw: string | null | undefined;
let cachedScans: RecentScan[] = EMPTY;

/** Snapshot getter for `useSyncExternalStore`, cached by the raw string so
 *  repeated calls return a stable reference while storage is unchanged. */
export function getRecentScansSnapshot(): RecentScan[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedScans = parse(raw);
  }
  return cachedScans;
}

/** Local Storage is unknown during SSR; null lets callers render a neutral
 *  placeholder instead of flashing the empty state before hydration. */
export function getServerRecentScansSnapshot(): RecentScan[] | null {
  return null;
}

export function subscribeRecentScans(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
