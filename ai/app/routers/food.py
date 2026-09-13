import os
import json
from fastapi import Header
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

class IngredientRequest(BaseModel):
    ingredient: str
    language: str

from app.db.postgres import get_session
from app.db.models import FoodItem

router = APIRouter()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

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

    actual_api_key = x_api_key if x_api_key else os.getenv("GEMINI_API_KEY")
    local_client = genai.Client(api_key=actual_api_key)

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
        
        response = await local_client.aio.models.generate_content(
            model='gemini-3.6-flash',
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
        
        food_list_data = []
        for item in food_items:
            food_list_data.append({
                "food_id": item.food_id,          
                "name_en": item.name_en,
                "name_th": item.name_th,
                "name_jp": item.name_jp,          
                "description": item.description,  
                "ingredients": item.ingredients,  
                "spicy_level": item.spicy_level,
                "calories": item.calories_kcal,    
                "protein": item.protein_g,        
                "carbs": item.carbohydrate_g,      
                "fat": item.fat_g,                
                "how_to_eat": item.how_to_eat,    
                "source_url": item.source_url,
                "image_url": item.image_url
            })

        print(f"[DEBUG] 7. Successfully matched {len(food_list_data)} items in database!")
        
        return {
            "status": "success",
            "message": f"Found {len(food_list_data)} food item(s).",
            "data": food_list_data
        }

    except Exception as e:
        print(f"\n[DEBUG ERROR] analyze_food failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")

@router.post("/ingredient-detail")
async def get_ingredient_detail(
    request: IngredientRequest,
    x_api_key: Optional[str] = Header(None)
):
    try:
        actual_api_key = x_api_key if x_api_key else os.getenv("GEMINI_API_KEY")
        local_client = genai.Client(api_key=actual_api_key)

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
        ai_response = await local_client.aio.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt
        )

        print("[DEBUG] 3. Gemini has replied!")
        print(f"[DEBUG] Raw AI Output:\n{ai_response.text.strip()}")
        
        clean_text = ai_response.text.replace("```json", "").replace("```", "").strip()
        result_data = json.loads(clean_text)

        print("[DEBUG] 4. Successfully parsed JSON data!")
        
        return {
            "status": "success",
            "data": result_data
        }

    except Exception as e:
        print(f"\n[DEBUG ERROR] get_ingredient_detail failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")