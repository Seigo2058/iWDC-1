import type {
  AnalyzeResult,
  ApiLang,
  FoodData,
  LocalizedText,
  SpicyLevel,
} from "@/lib/analyze/types";

const API_URL = process.env.NEXT_PUBLIC_ANALYZE_FOOD_API_URL;

// The backend has not shared its analysis latency yet
// (connect-aisystem.md 5-3); this is the agreed placeholder.
const TIMEOUT_MS = 30_000;

/** Sends the confirmed photo to the analyze-food API and normalizes the reply. */
export async function submitPhoto(image: Blob): Promise<AnalyzeResult> {
  if (!API_URL) {
    return { outcome: "error", reason: "config" };
  }

  const formData = new FormData();
  formData.append(
    "file",
    new File([image], "photo.jpg", { type: image.type || "image/jpeg" }),
  );

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return { outcome: "error", reason: timedOut ? "timeout" : "network" };
  }

  // Documented technical failures (connect-aisystem.md 3.5).
  if (response.status === 400 || response.status === 422 || response.status >= 500) {
    return { outcome: "error", reason: "server" };
  }

  const body: unknown = await response.json().catch(() => null);
  const food = isSuccessBody(body) ? toFoodData(body.data) : null;

  // The backend's dedicated "no match" status code is still unspecified
  // (connect-aisystem.md 5-2), so anything that is not a well-formed success
  // is read as not found rather than guessed at.
  return food ? { outcome: "success", food } : { outcome: "notFound" };
}

type SuccessBody = { status: "success"; data: Record<string, unknown> };

function isSuccessBody(body: unknown): body is SuccessBody {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    candidate.status === "success" &&
    typeof candidate.data === "object" &&
    candidate.data !== null
  );
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
    ingredients: toIngredients(raw.ingredients),
    spicyLevel: toSpicyLevel(raw.spicy_level),
    calories: asNumber(raw.calories),
    protein: asNumber(raw.protein),
    carbs: asNumber(raw.carbs),
    fat: asNumber(raw.fat),
    howToEat: toLocalizedText(raw.how_to_eat),
    sourceUrl: asText(raw.source_url),
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
 *  per-language object (connect-aisystem.md 3.3), so both shapes are accepted. */
function toIngredients(value: unknown): Record<ApiLang, string[]> {
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
