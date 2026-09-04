"""Request / response models for documents."""

from pydantic import BaseModel, Field


class OCRResult(BaseModel):
    """Raw output of the OCR step."""

    text: str = Field(description="Full extracted text")
    pages: int = Field(default=1, description="Number of pages processed")


class DocumentIngestResponse(BaseModel):
    """Result of upload -> OCR -> vector store ingestion."""

    document_id: str
    filename: str
    chunk_count: int = Field(description="Number of chunks stored in the vector store")
    text_preview: str = Field(description="Beginning of the extracted text")
