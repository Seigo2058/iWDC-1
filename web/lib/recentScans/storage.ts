import type { FoodData } from "@/lib/analyze/types";

/** Local Storage only — never sent to the server (recent-scans.md 1, 3.4). */
const STORAGE_KEY = "recentScans";
const MAX_ENTRIES = 20;
// `storage` only fires in other tabs; this also notifies the current one.
const CHANGE_EVENT = "recentscans-change";

/** Snapshot of a dish at scan time (recent-scans.md 3.2). */
export interface RecentScan {
  foodId: number;
  nameEn: string;
  nameTh: string;
  nameJp: string;
  imageUrl: string | null;
  scannedAt: string;
}

const EMPTY: RecentScan[] = [];

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
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  const nameEn = text(raw.nameEn);
  const scannedAt = typeof raw.scannedAt === "string" ? raw.scannedAt : null;
  if (
    !Number.isInteger(raw.foodId) ||
    !nameEn ||
    !scannedAt ||
    Number.isNaN(Date.parse(scannedAt))
  ) {
    return null;
  }

  return {
    foodId: raw.foodId as number,
    nameEn,
    nameTh: text(raw.nameTh) ?? nameEn,
    nameJp: text(raw.nameJp) ?? nameEn,
    imageUrl: text(raw.imageUrl),
    scannedAt,
  };
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

/** Records a dish at the front, replacing an older entry for the same dish
 *  and dropping the oldest past MAX_ENTRIES (recent-scans.md 3.3). */
export function saveRecentScan(food: FoodData, scannedAt: string): void {
  if (typeof window === "undefined" || food.foodId === null) return;

  const entry: RecentScan = {
    foodId: food.foodId,
    nameEn: food.nameEn,
    nameTh: food.nameTh,
    nameJp: food.nameJp,
    imageUrl: food.imageUrl,
    scannedAt,
  };
  const others = read().filter((scan) => scan.foodId !== entry.foodId);
  write([entry, ...others].slice(0, MAX_ENTRIES));
}

export function removeRecentScan(foodId: number): void {
  if (typeof window === "undefined") return;
  const scans = read();
  const remaining = scans.filter((scan) => scan.foodId !== foodId);
  if (remaining.length !== scans.length) write(remaining);
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
