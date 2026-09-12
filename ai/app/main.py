from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import food  # Import the new router file

app = FastAPI(title="Point & Know AI Backend")

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