"""Text chunking and embedding generation."""


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
    """Turn chunks into embedding vectors.

    Not implemented: pick an embedding model (sentence-transformers / OpenAI / Voyage)
    before filling this in. If Chroma's built-in embedding function is used instead,
    this function can be dropped entirely.
    """
    raise NotImplementedError("No embedding model has been chosen yet (app/services/embedding.py)")
