import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

class IngredientRequest(BaseModel):
    ingredient: str
    language: str

from app.db.postgres import get_session
from app.db.models import FoodItem
from app.services import gemini

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
    db: AsyncSession = Depends(get_session)
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
        response = await gemini.generate_content(
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type=file.content_type)
            ],
            config=types.GenerateContentConfig(tools=[])
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
async def get_ingredient_detail(request: IngredientRequest):
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
        ai_response = await gemini.generate_content(contents=prompt)

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