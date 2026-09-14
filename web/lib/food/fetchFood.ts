import { asRecord, toFoodData } from "@/lib/analyze/parseFood";
import type { FoodData } from "@/lib/analyze/types";

// A single database lookup with no AI involved, so shorter than analysis (30 s)
// and ingredient detail (20 s); provisional (recent-scans.md 6.2).
const TIMEOUT_MS = 10_000;

export type FetchFoodFailureReason = "network" | "timeout" | "config" | "server";

export type FetchFoodResult =
  | { outcome: "success"; food: FoodData }
  | { outcome: "notFound" }
  | { outcome: "error"; reason: FetchFoodFailureReason };

/** Loads one dish from the database via `GET /api/foods/{food_id}`
 *  (recent-scans.md 5). Never throws. */
export async function fetchFood(foodId: number): Promise<FetchFoodResult> {
  let response: Response;
  try {
    // Same-origin path; next.config.ts rewrites it to the FastAPI backend.
    response = await fetch(`/api/foods/${foodId}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return { outcome: "error", reason: timedOut ? "timeout" : "network" };
  }

  // A missing dish is a 200 "not_found"; a 404 only happens when the rewrite
  // (AI_API_ORIGIN) is not set up (recent-scans.md 5.2).
  if (response.status === 404) return { outcome: "error", reason: "config" };
  if (!response.ok) return { outcome: "error", reason: "server" };

  const body = asRecord(await response.json().catch(() => null));
  if (body.status === "not_found") return { outcome: "notFound" };

  const food = body.status === "success" ? toFoodData(body.data) : null;
  return food
    ? { outcome: "success", food }
    : { outcome: "error", reason: "server" };
}
