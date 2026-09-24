from pydantic import BaseModel
from typing import Optional

class FoodItemBase(BaseModel):
    name_en: str
    name_th: str
    name_jp: str
    country: Optional[str] = None
    description: Dict[str, str]
    ingredients: str
    spicy_level: str
    # Estimated ranges as text, e.g. "350 - 450".
    calories_kcal: Optional[str] = None
    protein_g: Optional[str] = None
    carbohydrate_g: Optional[str] = None
    fat_g: Optional[str] = None
    audience: Optional[str] = None
    how_to_eat: Optional[str] = None
    source_url: Optional[str] = None

class FoodItemResponse(FoodItemBase):
    food_id: int

    class Config:
        from_attributes = True # This tells Pydantic to read the SQLAlchemy model