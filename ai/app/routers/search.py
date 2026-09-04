"""Search endpoints (vector search / RAG)."""

from fastapi import APIRouter

from app.schemas import SearchRequest, SearchResponse
from app.services import rag

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
def search(request: SearchRequest) -> SearchResponse:
    """Return similar chunks without generating an answer."""
    hits = rag.retrieve(request.query, request.top_k)
    return SearchResponse(query=request.query, hits=hits)


@router.post("/ask", response_model=SearchResponse)
def ask(request: SearchRequest) -> SearchResponse:
    """Generate an answer grounded in the retrieved chunks (RAG)."""
    hits = rag.retrieve(request.query, request.top_k)
    answer = rag.generate_answer(request.query, hits)
    return SearchResponse(query=request.query, hits=hits, answer=answer)
