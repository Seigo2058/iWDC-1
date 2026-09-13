import { toApiLang } from "@/lib/analyze/localize";
import type {
  IngredientDetail,
  IngredientDetailResult,
} from "@/lib/ingredient/types";
import type { Locale } from "@/lib/locales";

// Same-origin path; next.config.ts rewrites it to the FastAPI backend.
const INGREDIENT_DETAIL_PATH = "/api/ingredient-detail";

// Measured at ~5-6 s locally; provisional (ingredient-detail.md 5.2).
const TIMEOUT_MS = 20_000;

// Successes only, for this page session (ingredient-detail.md 6). Failures
// are never cached so reopening the ingredient retries.
const cache = new Map<string, IngredientDetail>();

// Requests are shared rather than cancelled: the backend keeps calling Gemini
// even if the browser aborts, so aborting would spend quota for nothing.
// Sharing also collapses React Strict Mode's double effect into one request,
// and a request that finishes after its modal closed still fills the cache.
const inFlight = new Map<string, Promise<IngredientDetailResult>>();

function cacheKey(ingredient: string, lang: Locale): string {
  return JSON.stringify([toApiLang(lang), ingredient]);
}

export function getCachedIngredientDetail(
  ingredient: string,
  lang: Locale,
): IngredientDetail | undefined {
  return cache.get(cacheKey(ingredient, lang));
}

/** Asks the AI to explain an ingredient in the given language. Never
 *  rejects. Callers that no longer need the answer simply ignore it. */
export function fetchIngredientDetail(
  ingredient: string,
  lang: Locale,
): Promise<IngredientDetailResult> {
  const key = cacheKey(ingredient, lang);

  const cached = cache.get(key);
  if (cached) return Promise.resolve({ outcome: "success", detail: cached });

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = requestIngredientDetail(ingredient, lang)
    .then((result) => {
      if (result.outcome === "success") cache.set(key, result.detail);
      return result;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, request);
  return request;
}

async function requestIngredientDetail(
  ingredient: string,
  lang: Locale,
): Promise<IngredientDetailResult> {
  let body: unknown;
  try {
    const response = await fetch(INGREDIENT_DETAIL_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredient, language: toApiLang(lang) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // The path only exists through the rewrite, so a 404 means AI_API_ORIGIN
    // is unset or points somewhere without the ingredient-detail route.
    if (response.status === 404) {
      return { outcome: "error", reason: "config" };
    }

    if (!response.ok) {
      if (response.status === 422) {
        // Only reachable if this client sends a malformed request.
        console.error(
          "[ingredient-detail] request rejected by the backend (422)",
          await response.text().catch(() => ""),
        );
      }
      return { outcome: "error", reason: "server" };
    }

    body = await response.json().catch(() => null);
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return { outcome: "error", reason: timedOut ? "timeout" : "network" };
  }

  const detail = toIngredientDetail(body);
  return detail
    ? { outcome: "success", detail }
    : { outcome: "error", reason: "server" };
}

/** The backend returns Gemini's JSON without checking its keys or types
 *  (ingredient-detail.md 3.3), so both are validated here. */
function toIngredientDetail(body: unknown): IngredientDetail | null {
  const root = asRecord(body);
  if (root.status !== "success") return null;

  const data = asRecord(root.data);
  const whatIsIt = asText(data.what_is_it);
  if (!whatIsIt) return null;

  return { whatIsIt, madeOf: asText(data.made_of) };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
