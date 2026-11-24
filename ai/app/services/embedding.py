"""Text chunking and embedding generation."""

import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_EMBED_MODEL = os.environ.get("GEMINI_EMBED_MODEL", "models/text-embedding-004")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def split_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    """Split text into fixed-size chunks with overlap."""
    if chunk_size <= overlap:
        raise ValueError("chunk_size must be greater than overlap")

    chunks: list[str] = []
    start = 0
    while start < len(text):
        chunks.append(text[start : start + chunk_size])
        start += chunk_size - overlap
    return chunks


def embed(texts: list[str]) -> list[list[float]]:
    """Turn chunks into embedding vectors using Gemini Embedding API."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in environment variables.")

    embeddings: list[list[float]] = []

    for text in texts:
        try:
            result = genai.embed_content(
                model=GEMINI_EMBED_MODEL,
                content=text,
            )
            embeddings.append(result["embedding"])
        except Exception as e:
            print(f"[DEBUG ERROR] Gemini Embedding failed for chunk: {str(e)}")
            raise e

    return embeddings