"""ChromaDB (vector store) connection."""

from functools import lru_cache

import chromadb
from chromadb.api.models.Collection import Collection

from app.config import get_settings

settings = get_settings()


@lru_cache
def get_client() -> chromadb.ClientAPI:
    """Local persistent client. Swap for HttpClient when running Chroma as a server."""
    return chromadb.PersistentClient(path=settings.chroma_persist_dir)


def get_collection() -> Collection:
    return get_client().get_or_create_collection(name=settings.chroma_collection)
