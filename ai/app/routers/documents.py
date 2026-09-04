"""Document upload and ingestion (OCR -> chunking -> vector store)."""

import uuid

from fastapi import APIRouter, File, UploadFile

from app.db import get_collection
from app.schemas import DocumentIngestResponse
from app.services import embedding, ocr

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentIngestResponse)
async def ingest_document(file: UploadFile = File(...)) -> DocumentIngestResponse:
    content = await file.read()
    filename = file.filename or "unnamed"

    result = ocr.extract_text(content, filename)
    chunks = embedding.split_text(result.text)

    document_id = str(uuid.uuid4())
    get_collection().add(
        ids=[f"{document_id}:{i}" for i in range(len(chunks))],
        documents=chunks,
        metadatas=[
            {"document_id": document_id, "filename": filename, "chunk_index": i}
            for i in range(len(chunks))
        ],
    )

    return DocumentIngestResponse(
        document_id=document_id,
        filename=filename,
        chunk_count=len(chunks),
        text_preview=result.text[:200],
    )
