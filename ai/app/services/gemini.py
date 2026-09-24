"""Gemini generation with automatic model fallback.

The free tier limits requests per model (e.g. 20 per day for each model), and
individual models are sometimes overloaded, so when one model cannot answer
right now the same request is retried on the next model in the list.
"""
import asyncio
import hashlib
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

# Thinking is most of Gemini 3's latency and these tasks (naming a dish,
# explaining an ingredient) need little of it: image analysis on
# gemini-3.6-flash took 8.5 s by default and 1.9 s at MINIMAL (2026-09-14).
# Not every model accepts every level (gemini-3.8-flash rejects MINIMAL with a
# 400), so each model steps down this list until one is accepted; None leaves
# the model's default.
THINKING_LEVELS: list[types.ThinkingLevel | None] = [
    types.ThinkingLevel.MINIMAL,
    types.ThinkingLevel.LOW,
    None,
]

# With minimal thinking a healthy model answers in ~2-3 s. Overloaded ones were
# seen hanging for 20-36 s before a 503, so each model gets this long; two
# misses still leave room for a third model within the web app's timeouts
# (20 s ingredient detail, 30 s analysis).
ATTEMPT_TIMEOUT_SECONDS = 8

# A per-day quota does not come back until Google's daily reset, but its 429
# still carries a short retryDelay, so the model is rechecked hourly instead;
# a failed 429 call does not count against the quota.
DAILY_QUOTA_RECHECK_SECONDS = 60 * 60
DEFAULT_RETRY_SECONDS = 60
# Overload was seen lasting well over a minute; rechecking every minute made
# most scans pay the timeout of the busy model first again.
BUSY_RETRY_SECONDS = 10 * 60
# ...but when every model is marked busy, they are retried anyway (see
# generate_content) as long as the request is younger than this, so the last
# try (up to ATTEMPT_TIMEOUT_SECONDS) still ends within the web app's 20 s
# ingredient-detail timeout.
LAST_RESORT_BUDGET_SECONDS = 12

QUOTA = "quota"
BUSY = "busy"

# In-memory, per process: until when each model is skipped and why, models the
# API no longer serves (404), and the thinking level each model accepts (an
# index into THINKING_LEVELS; absent means the first).
_cooldowns: dict[str, tuple[float, str]] = {}
_unavailable: set[str] = set()
_thinking_level_index: dict[str, int] = {}


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
def _client(api_key: str | None = None) -> genai.Client:
    # Created on first use so ai/.env has been loaded by then; one per key
    # (the default one from ai/.env, or a caller's own key).
    return genai.Client(api_key=api_key or os.getenv("GEMINI_API_KEY"))


def _slot(model: str, api_key: str | None) -> str:
    # Request limits belong to a key, so a caller's own key keeps its own
    # cooldowns instead of sharing (and spending) the default key's.
    if not api_key:
        return model
    return f"{model}#{hashlib.sha256(api_key.encode()).hexdigest()[:12]}"


def _models() -> list[str]:
    configured = [m.strip() for m in os.getenv("GEMINI_MODELS", "").split(",")]
    return [m for m in configured if m] or DEFAULT_MODELS


def _cool_down(model: str, seconds: float, reason: str, message: str) -> None:
    _cooldowns[model] = (time.time() + seconds, reason)
    print(f"[GEMINI] {model} {message}; trying the next model.")


async def generate_content(
    contents,
    config: types.GenerateContentConfig | None = None,
    api_key: str | None = None,
) -> types.GenerateContentResponse:
    """Like `client.aio.models.generate_content`, but moves on to the next model
    on 429 (request limit), 503 (overloaded), no answer within
    ATTEMPT_TIMEOUT_SECONDS, or 404 (model retired). Other errors are raised
    as-is. Raises GeminiUnavailableError when no model is left. `api_key`
    uses a caller's own key (the routes' X-API-Key header) instead of the
    one in ai/.env."""
    started = time.time()
    models = _models()
    tried: set[str] = set()
    last_error: Exception | None = None

    async def attempt(model: str) -> types.GenerateContentResponse | None:
        nonlocal last_error
        tried.add(model)
        slot = _slot(model, api_key)
        try:
            response = await _generate_on(model, contents, config, api_key)
        except TimeoutError as error:
            _cool_down(slot, BUSY_RETRY_SECONDS, BUSY,
                       f"did not answer within {ATTEMPT_TIMEOUT_SECONDS}s")
            last_error = error
            return None
        except errors.APIError as error:
            if error.code == 429:
                _cool_down(slot, _retry_after_seconds(error), QUOTA,
                           "hit its request limit")
            elif error.code == 503:
                _cool_down(slot, BUSY_RETRY_SECONDS, BUSY, "is overloaded (503)")
            elif error.code == 404:
                _unavailable.add(model)
                print(f"[GEMINI] {model} is not available (404); trying the next model.")
            else:
                raise
            last_error = error
            return None
        _cooldowns.pop(slot, None)
        print(f"[GEMINI] Answered by {model}")
        return response

    def cooling(model: str) -> tuple[float, str] | None:
        until, reason = _cooldowns.get(_slot(model, api_key), (0, ""))
        return (until, reason) if until > time.time() else None

    for model in models:
        if model in _unavailable or cooling(model):
            continue
        response = await attempt(model)
        if response is not None:
            return response

    # Last resort: every model left is only cooling down as "busy". Overload
    # is often momentary, and with every model marked busy after one bad
    # spell, requests were refused for BUSY_RETRY_SECONDS without a single
    # call while some models had long recovered (2026-09-16). So they are
    # tried anyway, soonest to come back first, while the web app still
    # waits for an answer. Models out of quota stay skipped (they would 429).
    busy = sorted(
        (m for m in models
         if m not in _unavailable and m not in tried
         and (state := cooling(m)) and state[1] == BUSY),
        key=lambda m: cooling(m)[0],
    )
    for model in busy:
        if time.time() - started > LAST_RESORT_BUDGET_SECONDS:
            break
        print(f"[GEMINI] Retrying {model} although it was marked busy.")
        response = await attempt(model)
        if response is not None:
            return response

    now = time.time()
    slots = {_slot(m, api_key) for m in models}
    reasons = [reason for s, (until, reason) in _cooldowns.items()
               if s in slots and until > now]
    if not reasons:
        raise RuntimeError(f"No usable Gemini model in {models}") from last_error
    raise GeminiUnavailableError(
        quota_exhausted=all(reason == QUOTA for reason in reasons)
    ) from last_error


async def _generate_on(
    model: str,
    contents,
    config: types.GenerateContentConfig | None,
    api_key: str | None,
) -> types.GenerateContentResponse:
    """One model, at the lowest thinking level it accepts. A caller-supplied
    thinking_config is left untouched."""
    if config is not None and config.thinking_config is not None:
        return await _attempt(model, contents, config, api_key)

    index = _thinking_level_index.get(model, 0)
    while True:
        level = THINKING_LEVELS[index]
        attempt_config = (config or types.GenerateContentConfig()).model_copy(
            update={
                "thinking_config": types.ThinkingConfig(thinking_level=level)
                if level
                else None
            }
        )
        try:
            return await _attempt(model, contents, attempt_config, api_key)
        except errors.APIError as error:
            if not (
                error.code == 400
                and "thinking" in (error.message or "").lower()
                and index + 1 < len(THINKING_LEVELS)
            ):
                raise
            index += 1
            _thinking_level_index[model] = index
            print(f"[GEMINI] {model} rejected thinking level {level}; using {THINKING_LEVELS[index]}.")


async def _attempt(
    model: str,
    contents,
    config: types.GenerateContentConfig | None,
    api_key: str | None,
) -> types.GenerateContentResponse:
    return await asyncio.wait_for(
        _client(api_key).aio.models.generate_content(
            model=model, contents=contents, config=config
        ),
        timeout=ATTEMPT_TIMEOUT_SECONDS,
    )


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
