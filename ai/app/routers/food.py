import os
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
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
    db: AsyncSession = Depends(get_session)
):
    # Ensure the uploaded file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    # 1. Read the cropped image sent from Next.js
    print("\n[DEBUG] 1. Reading image file...")
    image_bytes = await file.read()
    print(f"[DEBUG] 2. File read successfully! File size:: {len(image_bytes) / 1024:.2f} KB")

    # 2. Strict Gemini Prompt
    prompt = (
            "You are an expert food classifier and menu translator. "
            "Identify the base dish from the image or text. "
            "CRITICAL: Ignore specific meats, seafood, or variations. "
            "For example, if the dish is 'Pad Krapow Crispy Pork' or 'Seafood Pad Krapow', return ONLY 'Pad Krapow'. "
            "If it is a variation of Tom Yum, return ONLY 'Tom Yum Goong'. "
            "Return ONLY the standard English base name with no punctuation."
    )
    
    try:
        print("[DEBUG] 3. Sending the image to Gemini for analysis... (If it gets stuck here, it means Gemini is taking a long time to load.)")

        # Send both the prompt and the image bytes to Gemini 3.6 Flash
        response = await client.aio.models.generate_content(
            model='gemini-3.6-flash',
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type=file.content_type)
            ],
            config=types.GenerateContentConfig(
                tools=[]  
            )
        )
        
        print("[DEBUG] 4. Gemini has replied!")
        detected_name_en = response.text.strip()
        print(f"[DEBUG] 5. The resulting name is...: '{detected_name_en}'")

        print(f"\n=== [DEBUG] Gemini guessed the name of the dish as...: '{detected_name_en}' ===\n")
        
        # Search the database for the English name (case-insensitive)
        query = select(FoodItem).where(FoodItem.name_en.ilike(detected_name_en))
        result = await db.execute(query)
        food_data = result.scalars().first()

        # If Gemini recognizes the food, but we don't have it in the database
        if not food_data:
            return {
                "status": "partial_success",
                "detected_name": detected_name_en,
                "message": "Food recognized, but details are not in our database yet.",
                "data": None
            }
        
        # If everything matches perfectly!
        return {
            "status": "success",
            "detected_name": detected_name_en,
            "message": "Food found successfully.",
            "data": {
                "food_id": food_data.food_id,           
                "name_en": food_data.name_en,
                "name_th": food_data.name_th,
                "name_jp": food_data.name_jp,           
                "description": food_data.description,   
                "ingredients": food_data.ingredients,   
                "spicy_level": food_data.spicy_level,
                "calories": food_data.calories_kcal,    
                "protein": food_data.protein_g,         
                "carbs": food_data.carbohydrate_g,      
                "fat": food_data.fat_g,                 
                "how_to_eat": food_data.how_to_eat,     
                "source_url": food_data.source_url,
                "image_url": food_data.image_url
                
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Processing Error: {str(e)}")

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
        ai_response = await client.aio.models.generate_content(
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