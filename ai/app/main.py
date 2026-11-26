from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import food
from app.db.chroma import get_collection
from app.db.postgres import async_sessionmaker

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        collection = get_collection()
        current_count = collection.count()
        
        if current_count == 0:
            print("[STARTUP] ChromaDB is empty. Auto-ingesting data from Supabase...")
            async with async_sessionmaker() as db:
                res = await food.ingest_food_data(db=db)
                print(f"[STARTUP] {res.get('message', 'Auto-ingest completed!')}")
        else:
            print(f"[STARTUP] ChromaDB already has {current_count} chunks. Ready!")
    except Exception as e:
        print(f"[STARTUP ERROR] Failed to auto-ingest data: {e}")

    yield

app = FastAPI(title="Point & Know AI Backend", lifespan=lifespan)

# unlock CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router
app.include_router(food.router, prefix="/api", tags=["Food Analysis"])

@app.get("/")
async def root():
    return {"message": "API is running"}