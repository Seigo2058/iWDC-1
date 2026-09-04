"""RAG: vector search plus answer generation."""

from app.db import get_collection
from app.schemas import SearchHit


def retrieve(query: str, top_k: int = 5) -> list[SearchHit]:
    """Fetch the most similar chunks from ChromaDB."""
    result = get_collection().query(query_texts=[query], n_results=top_k)

    ids = result.get("ids", [[]])[0]
    documents = result.get("documents", [[]])[0]
    distances = result.get("distances", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]

    return [
        SearchHit(
            document_id=str((metadata or {}).get("document_id", "")),
            chunk_id=str(chunk_id),
            text=text,
            # Chroma returns a distance, so convert it to a score where higher is closer
            score=1.0 - float(distance),
        )
        for chunk_id, text, distance, metadata in zip(
            ids, documents, distances, metadatas, strict=False
        )
    ]


def generate_answer(query: str, hits: list[SearchHit]) -> str:
    """Generate an answer using the retrieved chunks as context.

    Not implemented: call the generation model (e.g. the Claude API) here.
    """
    raise NotImplementedError("Answer generation is not implemented (app/services/rag.py)")
