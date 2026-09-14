"""Gemini generation with automatic model fallback.

The free tier limits requests per model (e.g. 20 per day for each model), and
individual models are sometimes overloaded, so when one model cannot answer
right now the same request is retried on the next model in the list.
"""
import asyncio
import os
import time
from functools import cache

from google import genai
from google.genai import errors, types

# Tried in order when GEMINI_MODELS is not set in ai/.env
# (e.g. GEMINI_MODELS="model-a,model-b"). All were confirmed to answer on this
# project's API key on 2026-09-13; the gemini-2.5 family is no longer available
# to new users (404).
DEFAULT_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
]

# Normal answers take ~1-6 s. An overloaded model was seen hanging for 36 s
# before answering 503, which would outlast the web app's own timeouts
# (20 s ingredient detail, 30 s analysis), so each model gets this long.
ATTEMPT_TIMEOUT_SECONDS = 12

# A per-day quota does not come back until Google's daily reset, but its 429
# still carries a short retryDelay, so the model is rechecked hourly instead;
# a failed 429 call does not count against the quota.
DAILY_QUOTA_RECHECK_SECONDS = 60 * 60
DEFAULT_RETRY_SECONDS = 60
# "Spikes in demand are usually temporary" (Gemini's 503 message).
BUSY_RETRY_SECONDS = 60

QUOTA = "quota"
BUSY = "busy"

# In-memory, per process: until when each model is skipped and why, and models
# the API no longer serves (404).
_cooldowns: dict[str, tuple[float, str]] = {}
_unavailable: set[str] = set()


class GeminiUnavailableError(Exception):
    """No configured model can answer right now."""

    def __init__(self, quota_exhausted: bool):
        self.quota_exhausted = quota_exhausted
        super().__init__(
            "All Gemini models have reached their request limit."
            if quota_exhausted
            else "No Gemini model is available right now (overloaded or not responding)."
        )


@cache
def _client() -> genai.Client:
    # Created on first use so ai/.env has been loaded by then.
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _models() -> list[str]:
    configured = [m.strip() for m in os.getenv("GEMINI_MODELS", "").split(",")]
    return [m for m in configured if m] or DEFAULT_MODELS


def _cool_down(model: str, seconds: float, reason: str, message: str) -> None:
    _cooldowns[model] = (time.time() + seconds, reason)
    print(f"[GEMINI] {model} {message}; trying the next model.")


async def generate_content(
    contents, config: types.GenerateContentConfig | None = None
) -> types.GenerateContentResponse:
    """Like `client.aio.models.generate_content`, but moves on to the next model
    on 429 (request limit), 503 (overloaded), no answer within
    ATTEMPT_TIMEOUT_SECONDS, or 404 (model retired). Other errors are raised
    as-is. Raises GeminiUnavailableError when no model is left."""
    last_error: Exception | None = None
    models = _models()

    for model in models:
        if model in _unavailable or _cooldowns.get(model, (0, ""))[0] > time.time():
            continue

        try:
            response = await asyncio.wait_for(
                _client().aio.models.generate_content(
                    model=model, contents=contents, config=config
                ),
                timeout=ATTEMPT_TIMEOUT_SECONDS,
            )
        except TimeoutError as error:
            _cool_down(model, BUSY_RETRY_SECONDS, BUSY,
                       f"did not answer within {ATTEMPT_TIMEOUT_SECONDS}s")
            last_error = error
            continue
        except errors.APIError as error:
            if error.code == 429:
                _cool_down(model, _retry_after_seconds(error), QUOTA,
                           "hit its request limit")
            elif error.code == 503:
                _cool_down(model, BUSY_RETRY_SECONDS, BUSY, "is overloaded (503)")
            elif error.code == 404:
                _unavailable.add(model)
                print(f"[GEMINI] {model} is not available (404); trying the next model.")
            else:
                raise
            last_error = error
            continue

        print(f"[GEMINI] Answered by {model}")
        return response

    now = time.time()
    cooling = [reason for m, (until, reason) in _cooldowns.items()
               if m in models and until > now]
    if not cooling:
        raise RuntimeError(f"No usable Gemini model in {models}") from last_error
    raise GeminiUnavailableError(
        quota_exhausted=all(reason == QUOTA for reason in cooling)
    ) from last_error


def _retry_after_seconds(error: errors.APIError) -> float:
    try:
        details = error.details["error"]["details"]
        quota_ids = [
            violation.get("quotaId", "")
            for detail in details
            for violation in detail.get("violations", [])
        ]
        if any("PerDay" in quota_id for quota_id in quota_ids):
            return DAILY_QUOTA_RECHECK_SECONDS
        delay = next(d["retryDelay"] for d in details if "retryDelay" in d)
        return float(delay.rstrip("s"))
    except (KeyError, TypeError, ValueError, StopIteration, AttributeError):
        return DEFAULT_RETRY_SECONDS
