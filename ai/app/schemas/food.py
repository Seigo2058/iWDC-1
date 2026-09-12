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
    calories_kcal: Optional[int] = None
    protein_g: Optional[float] = None
    carbohydrate_g: Optional[float] = None
    fat_g: Optional[float] = None
    audience: Optional[str] = None
    how_to_eat: Optional[str] = None
    source_url: Optional[str] = None

class FoodItemResponse(FoodItemBase):
    food_id: int

    class Config:
        from_attributes = True # This tells Pydantic to read the SQLAlchemy model