"""RAG: vector search plus answer generation."""

import os
import re
import requests
from dotenv import load_dotenv
from google.genai import types

from app.db.chroma import get_collection
from app.schemas import SearchHit
from app.services.embedding import embed
from app.services.gemini import generate_content as gemini_generate_content  

load_dotenv()

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5")


def _call_ollama(prompt: str, system: str | None = None, timeout: float = 25.0) -> str:
    """Access Local AI (Ollama) via a specified URL (localhost or Ngrok)"""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload: dict[str, object] = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }
    if system:
        payload["system"] = system

    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json().get("response", "").strip()


async def _call_gemini(prompt: str, system: str | None = None) -> str:
    """Access Gemini via `gemini.py` (includes an automatic model-switching system for 429/503 errors)."""
    config = types.GenerateContentConfig(system_instruction=system) if system else None
    response = await gemini_generate_content(contents=prompt, config=config)
    return (response.text or "").strip()


async def translate_query_to_english(query: str) -> str:
    """Translate user query to English for vector search (Local AI first, Gemini fallback)."""
    prompt = f"""Translate the following text to English. Output ONLY the English translation. 
IMPORTANT: For Asian food names (Thai/Japanese), use their commonly known English transliteration (e.g., Pad Krapow, Omurice, Massaman, Takoyaki, Kuay Teow Reua). Do not translate food names literally.
Text: {query}
Translation:"""

    translated = ""

    try:
        translated = _call_ollama(prompt=prompt, timeout=15.0)
    except Exception as ollama_err:
        print(f"[DEBUG] Local translation failed ({OLLAMA_BASE_URL}): {ollama_err}")
        try:
            translated = await _call_gemini(prompt=prompt)
            print("[DEBUG] Translated via Gemini fallback.")
        except Exception as gemini_err:
            print(f"[DEBUG] Gemini translation fallback also failed: {gemini_err}")
            return query

    if not translated:
        return query

    if "\n" in translated:
        translated = translated.split("\n")[-1].strip()

    print(f"[DEBUG] Original Query: {query}")
    print(f"[DEBUG] Translated for Search: {translated}")

    return translated if len(translated) < len(query) * 4 else query


async def retrieve(query: str, top_k: int = 10) -> list[SearchHit]:
    """Fetch the most similar chunks from ChromaDB using an English-translated query."""

    english_query = await translate_query_to_english(query)
    print(f"[DEBUG] Original Query: {query}")
    print(f"[DEBUG] Translated Query for Search: {english_query}")

    query_vector = embed([english_query])[0]

    result = get_collection().query(
        query_embeddings=[query_vector],
        n_results=top_k,
    )

    ids = result.get("ids", [[]])[0]
    documents = result.get("documents", [[]])[0]
    distances = result.get("distances", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]

    return [
        SearchHit(
            document_id=str((metadata or {}).get("document_id", "")),
            chunk_id=str(chunk_id),
            text=text,
            score=1.0 - float(distance),
        )
        for chunk_id, text, distance, metadata in zip(
            ids, documents, distances, metadatas, strict=False
        )
    ]


def detect_language(query: str) -> str:
    """Detect the language from the characters in the question to steer the AI's behavior."""
    if re.search(r"[\u0E00-\u0E7F]", query):
        return "Thai"
    elif re.search(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]", query):
        return "Japanese"
    else:
        return "English"


def get_fallback_message(user_lang: str) -> str:
    """Return the rejection message based on the detected language."""
    if user_lang == "Thai":
        return "ขออภัยครับ ข้อมูลนี้ไม่มีในระบบ"
    elif user_lang == "Japanese":
        return "申し訳ありませんが、その情報はシステムにありません。"
    else:
        return "I'm sorry, I don't have this information in the system."


async def generate_answer(query: str, hits: list[SearchHit]) -> str:
    """Generate an answer using the retrieved chunks (Local AI first, Gemini fallback)."""
    user_lang = detect_language(query)
    print(f"[DEBUG] generate_answer received {len(hits)} chunks.")

    if not hits:
        print("[DEBUG] No chunks found in ChromaDB!")
        return get_fallback_message(user_lang)

    context_text = "\n\n".join([hit.text for hit in hits])
    prompt = f"Context:\n{context_text}\n\nQuestion: {query}"

    system_instruction = f"""You are a strict food AI assistant.
1. The user's question is in {user_lang}. You MUST answer ENTIRELY in {user_lang}. Do not use any other languages.
2. Answer based ONLY on the Context provided. Do not hallucinate.
3. If the Context contains only a partial answer, provide what you can based on the Context.
4. ONLY if the Context has absolutely no relevant information, you MUST output exactly this secret code and nothing else: DATA_NOT_FOUND
"""

    ai_response = ""
    used_provider = ""

    try:
        ai_response = _call_ollama(prompt=prompt, system=system_instruction, timeout=45.0)
        used_provider = f"Local AI ({OLLAMA_BASE_URL})"
    except Exception as ollama_err:
        print(f"[DEBUG] Local AI failed ({OLLAMA_BASE_URL}): {ollama_err}")
        print("[DEBUG] Switching automatically to Gemini API...")

        # A living hell: automatically calling the Gemini API.
        try:
            ai_response = await _call_gemini(prompt=prompt, system=system_instruction)
            used_provider = "Gemini API (Auto-Model)"
        except Exception as gemini_err:
            return f"Error: Both Local AI ({ollama_err}) and Gemini API ({gemini_err}) failed."

    print(f"[DEBUG] Answer generated by: {used_provider}")

    if not ai_response or "DATA_NOT_FOUND" in ai_response:
        return get_fallback_message(user_lang)

    return ai_response