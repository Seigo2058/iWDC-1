import type {
  AnalyzeResult,
  ApiLang,
  FoodData,
  LocalizedText,
  SpicyLevel,
} from "@/lib/analyze/types";

// Same-origin path; next.config.ts rewrites it to the FastAPI backend.
const ANALYZE_FOOD_PATH = "/api/analyze-food";

// The backend has not shared its analysis latency yet
// (connect-aisystem.md 5-3); this is the agreed placeholder.
const TIMEOUT_MS = 30_000;

/** Sends the confirmed photo to the analyze-food API and normalizes the reply. */
export async function submitPhoto(image: Blob): Promise<AnalyzeResult> {
  const formData = new FormData();
  formData.append(
    "file",
    new File([image], "photo.jpg", { type: image.type || "image/jpeg" }),
  );

  let response: Response;
  try {
    response = await fetch(ANALYZE_FOOD_PATH, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return { outcome: "error", reason: timedOut ? "timeout" : "network" };
  }

  // The path only exists through the rewrite, so a 404 means AI_API_ORIGIN is
  // unset or points somewhere without the analyze-food route.
  if (response.status === 404) {
    return { outcome: "error", reason: "config" };
  }

  // 400 / 422 / 500 are the documented technical failures
  // (connect-aisystem.md 3.5); a down backend surfaces here too via the proxy.
  if (!response.ok) {
    return { outcome: "error", reason: "server" };
  }

  // ai/app/routers/food.py can recognize several dishes in one photo (a menu,
  // a shared table) and returns every one found in the database as `data[]`.
  // Recognized dishes with no database row come back as "partial_success"
  // with data: [], and nothing recognized as "fail". Only a "success" with at
  // least one well-formed dish counts as a match; every other 200 is read as
  // not found.
  const body: unknown = await response.json().catch(() => null);
  const foods = isSuccessBody(body) ? toFoodList(body.data) : [];
  return foods.length > 0
    ? { outcome: "success", foods }
    : { outcome: "notFound" };
}

type SuccessBody = { status: "success"; data: unknown[] };

function isSuccessBody(body: unknown): body is SuccessBody {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return candidate.status === "success" && Array.isArray(candidate.data);
}

function toFoodList(items: unknown[]): FoodData[] {
  return items.flatMap((item) => {
    const food = toFoodData(asRecord(item));
    return food ? [food] : [];
  });
}

function toFoodData(raw: Record<string, unknown>): FoodData | null {
  const nameEn = asText(raw.name_en);
  if (!nameEn) return null;

  return {
    foodId: asNumber(raw.food_id),
    nameEn,
    nameTh: asText(raw.name_th) ?? nameEn,
    nameJp: asText(raw.name_jp) ?? nameEn,
    description: toLocalizedText(raw.description),
    ingredients: toLocalizedList(raw.ingredients),
    allergens: toLocalizedList(raw.allergens),
    spicyLevel: toSpicyLevel(raw.spicy_level),
    calories: asNumber(raw.calories),
    protein: asNumber(raw.protein),
    carbs: asNumber(raw.carbs),
    fat: asNumber(raw.fat),
    howToEat: toLocalizedText(raw.how_to_eat),
    sourceUrl: asText(raw.source_url),
    imageUrl: asText(raw.image_url),
  };
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function toLocalizedText(value: unknown): LocalizedText {
  const raw = asRecord(value);
  const en = asText(raw.en) ?? "";
  return { en, th: asText(raw.th) ?? en, jp: asText(raw.jp) ?? en };
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** `ingredients` was first specified as a flat English array and later as a
 *  per-language object (connect-aisystem.md 3.3), so both shapes are accepted.
 *  `allergens` follows the same per-language shape. */
function toLocalizedList(value: unknown): Record<ApiLang, string[]> {
  if (Array.isArray(value)) {
    const shared = toStringList(value);
    return { en: shared, th: shared, jp: shared };
  }

  const raw = asRecord(value);
  const en = toStringList(raw.en);
  const th = toStringList(raw.th);
  const jp = toStringList(raw.jp);
  return { en, th: th.length > 0 ? th : en, jp: jp.length > 0 ? jp : en };
}

const SPICY_LEVELS: SpicyLevel[] = [
  "No Spicy",
  "Low Spicy",
  "Medium Spicy",
  "Very Spicy",
];

function toSpicyLevel(value: unknown): SpicyLevel | null {
  return SPICY_LEVELS.find((level) => level === value) ?? null;
}
