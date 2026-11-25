import json
from fastapi import Header
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel
import uuid
from app.services.embedding import split_text, embed
from app.db.chroma import get_collection

load_dotenv()

class IngredientRequest(BaseModel):
    ingredient: str
    language: str

class ChatRequest(BaseModel):
    message: str

from app.db.postgres import get_session
from app.db.models import FoodItem
from app.services import gemini

from app.services.rag import retrieve, generate_answer

router = APIRouter()

def gemini_unavailable_http_error(error: gemini.GeminiUnavailableError) -> HTTPException:
    if error.quota_exhausted:
        return HTTPException(status_code=429, detail="AI request limit reached for all models. Please try again later.")
    return HTTPException(status_code=503, detail="AI models are busy right now. Please try again later.")

def food_to_dict(item: FoodItem) -> dict:
    """The dish shape shared by /analyze-food and /foods/{food_id}, so the web
    app parses both the same way."""
    return {
        "food_id": item.food_id,
        "name_en": item.name_en,
        "name_th": item.name_th,
        "name_jp": item.name_jp,
        "description": item.description,
        "ingredients": item.ingredients,
        "allergens": item.allergens,
        "spicy_level": item.spicy_level,
        # "Adult" or "Both" (adults and children), and the dish's country
        # ("Thailand", "Japan"); shown as "Suitable for" and "Sourcing".
        "audience": item.audience,
        "country": item.country,
        "calories": item.calories_kcal,
        "protein": item.protein_g,
        "carbs": item.carbohydrate_g,
        "fat": item.fat_g,
        "how_to_eat": item.how_to_eat,
        "source_url": item.source_url,
        "image_url": item.image_url
    }

@router.post("/analyze-food")
async def analyze_food(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
    x_api_key: Optional[str] = Header(None)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    print("\n[DEBUG] 1. Reading image file...")
    image_bytes = await file.read()
    print(f"[DEBUG] 2. File read successfully! Size: {len(image_bytes) / 1024:.2f} KB")

    prompt = """
    You are an expert food classifier and menu translator.
    Analyze the uploaded image.
    - If it is a single dish, return a JSON array containing its 1 base English name.
    - If it is a menu, extract all recognizable food items and return a JSON array of their base English names.
    CRITICAL: Ignore specific meats, seafood, or variations (e.g., return "Pad Krapow" not "Seafood Pad Krapow").
    Return ONLY a valid JSON array of strings. Do not include markdown tags like ```json.
    Example output: ["Pad Krapow", "Tom Yum Goong", "Green Curry"]
    """
    
    try:
        print("[DEBUG] 3. Sending image to Gemini (Hybrid Mode)...")

        # Through the model fallback (GEMINI_MODELS), with the caller's own
        # key when the X-API-Key header carries one.
        response = await gemini.generate_content(
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type=file.content_type)
            ],
            config=types.GenerateContentConfig(tools=[]),
            api_key=x_api_key,
        )
        
        print("[DEBUG] 4. Gemini has replied!")
        
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        detected_names = json.loads(clean_text)
        print(f"[DEBUG] 5. Detected names from AI: {detected_names}")

        if not detected_names:
            return {"status": "fail", "message": "No recognizable food detected."}

        print("[DEBUG] 6. Searching in database...")
        names_lower = [name.lower() for name in detected_names]
        query = select(FoodItem).where(func.lower(FoodItem.name_en).in_(names_lower))
        
        result = await db.execute(query)
        food_items = result.scalars().all()

        if not food_items:
            return {
                "status": "partial_success",
                "message": "Food recognized, but details are not in our database yet.",
                "detected_names": detected_names,
                "data": []
            }
        
        food_list_data = [food_to_dict(item) for item in food_items]

        print(f"[DEBUG] 7. Successfully matched {len(food_list_data)} items in database!")
        
        return {
            "status": "success",
            "message": f"Found {len(food_list_data)} food item(s).",
            "data": food_list_data
        }

    except gemini.GeminiUnavailableError as e:
        print(f"\n[DEBUG ERROR] analyze_food failed: {str(e)}")
        raise gemini_unavailable_http_error(e)
    except Exception as e:
        print(f"\n[DEBUG ERROR] analyze_food failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")

@router.get("/foods/{food_id}")
async def get_food(food_id: int, db: AsyncSession = Depends(get_session)):
    # "Not found" stays a 200 with a status, like /analyze-food: the web app
    # reads 404 as "the /api rewrite is missing" (a configuration error).
    try:
        item = await db.get(FoodItem, food_id)
    except Exception as e:
        print(f"\n[DEBUG ERROR] get_food failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Database error.")

    if item is None:
        return {"status": "not_found", "data": None}
    return {"status": "success", "data": food_to_dict(item)}

@router.post("/ingredient-detail")
async def get_ingredient_detail(
    request: IngredientRequest,
    x_api_key: Optional[str] = Header(None)
):
    try:
        print(f"\n[DEBUG] 1. Received request - Ingredient: '{request.ingredient}', Language: '{request.language}'")

        prompt = f"""
        You are a food expert. Explain the ingredient: '{request.ingredient}'.
        Provide the answer strictly in the '{request.language}' language.
        Respond ONLY in valid JSON format with exactly these two keys:
        - "what_is_it": A short 1-2 sentence description.
        - "made_of": A short string listing its raw materials.
        Do not include markdown tags like ```json.
        """
        
        print("[DEBUG] 2. Sending prompt to Gemini...")
        ai_response = await gemini.generate_content(contents=prompt, api_key=x_api_key)

        print("[DEBUG] 3. Gemini has replied!")
        print(f"[DEBUG] Raw AI Output:\n{ai_response.text.strip()}")
        
        clean_text = ai_response.text.replace("```json", "").replace("```", "").strip()
        result_data = json.loads(clean_text)

        print("[DEBUG] 4. Successfully parsed JSON data!")
        
        return {
            "status": "success",
            "data": result_data
        }

    except gemini.GeminiUnavailableError as e:
        print(f"\n[DEBUG ERROR] get_ingredient_detail failed: {str(e)}")
        raise gemini_unavailable_http_error(e)
    except Exception as e:
        print(f"\n[DEBUG ERROR] get_ingredient_detail failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")

# ==========================================
#  Endpoint For Chatbot RAG
# ==========================================

@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        print(f"\n[DEBUG] 1. Chat request received: {request.message}")
        
        hits = await retrieve(request.message)
        print(f"[DEBUG] 2. Retrieved {len(hits)} context chunks from database.")
        
        reply = await generate_answer(request.message, hits)
        print("[DEBUG] 3. AI Generated reply successfully.")
        
        return {"status": "success", "reply": reply}
        
    except Exception as e:
        print(f"\n[DEBUG ERROR] chat endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat Error: {str(e)}")

# ==========================================
# Endpoint for Data Ingestion 
# ==========================================
@router.post("/ingest-data")
async def ingest_food_data(db: AsyncSession = Depends(get_session)):
    try:
        print("\n[DEBUG] 1. Fetching data from Supabase...")
        result = await db.execute(select(FoodItem))
        food_items = result.scalars().all()

        if not food_items:
            return {"message": "No food items found in database."}

        collection = get_collection()
        total_chunks_added = 0
        
        print(f"[DEBUG] 2. Found {len(food_items)} items. Starting embedding process...")
        for item in food_items:
            if not item.food_story:
                continue
                
            full_text = f"Dish Name: {item.name_en} ({item.name_th})\n"
            full_text += f"Story: {item.food_story}\n"
            full_text += f"Ingredients: {item.ingredient_details}\n"
            full_text += f"For Kids/Allergens: {item.not_for_kids_reason}"
            
            chunks = split_text(full_text, chunk_size=800, overlap=100)
            
            vectors = embed(chunks)
            
            ids = [str(uuid.uuid4()) for _ in chunks]
            metadatas = [{"document_id": str(item.food_id), "name": item.name_en} for _ in chunks]
            
            collection.add(
                ids=ids,
                embeddings=vectors,
                documents=chunks,
                metadatas=metadatas
            )
            total_chunks_added += len(chunks)
            print(f"  -> Ingested {item.name_en} ({len(chunks)} chunks)")
            
        return {
            "status": "success", 
            "message": f"Successfully ingested {len(food_items)} items into {total_chunks_added} vector chunks."
        }

    except Exception as e:
        print(f"\n[DEBUG ERROR] Ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ingestion Error: {str(e)}")