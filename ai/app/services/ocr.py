"""OCR processing.

Not implemented: pick an OCR engine (Tesseract / Cloud Vision / a multimodal model)
before filling in extract_text. If Tesseract is chosen, uncomment the apt-get line
in the Dockerfile.
"""

from app.schemas import OCRResult


def extract_text(content: bytes, filename: str) -> OCRResult:
    """Extract text from the bytes of an uploaded file."""
    raise NotImplementedError("No OCR engine has been chosen yet (app/services/ocr.py)")
