import { asRecord, toFoodData } from "@/lib/analyze/parseFood";
import type { AnalyzeResult, FoodData } from "@/lib/analyze/types";

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
  const candidate = asRecord(body);
  return candidate.status === "success" && Array.isArray(candidate.data);
}

function toFoodList(items: unknown[]): FoodData[] {
  return items.flatMap((item) => {
    const food = toFoodData(item);
    return food ? [food] : [];
  });
}
