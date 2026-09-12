"""PostgreSQL connection (Async version).

Use with FastAPI dependency injection:

    @router.get("/items")
    async def list_items(session: AsyncSession = Depends(get_session)): ...
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, pool_pre_ping=True, future=True)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    autoflush=False, 
    expire_on_commit=False,
    class_=AsyncSession
)

class Base(DeclarativeBase):
    """Base class for ORM models. Define models in app/db/models.py or similar."""

async def get_session() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session