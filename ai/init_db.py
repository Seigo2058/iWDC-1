import asyncio

from app.db.postgres import engine, Base

from app.db.models import FoodItem 

async def create_tables():
    print("Connecting to the Cloud Database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Success: Database tables created perfectly!")

if __name__ == "__main__":
    asyncio.run(create_tables())