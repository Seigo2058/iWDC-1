from sqlalchemy import Column, Integer, String, Text, Float, JSON
from app.db.postgres import Base # Adjust this import if your Base is stored in app.config

class FoodItem(Base):
    __tablename__ = "food_items"

    food_id = Column(Integer, primary_key=True, index=True)
    name_en = Column(String, index=True)
    name_th = Column(String)
    name_jp = Column(String)
    country = Column(String)
    description = Column(JSON)
    ingredients = Column(JSON)
    # Per-language list of allergens, same shape as ingredients:
    # {"en": [...], "th": [...], "jp": [...]}
    allergens = Column(JSON)
    spicy_level = Column(String)
    calories_kcal = Column(Integer)
    protein_g = Column(Float)
    carbohydrate_g = Column(Float)
    fat_g = Column(Float)
    audience = Column(String)  # Adult or Children information
    how_to_eat = Column(JSON)
    source_url = Column(String)
    search_text = Column(Text)
    image_url = Column(String)
    
    # We use 'item_metadata' because 'metadata' is a reserved word in SQLAlchemy
    item_metadata = Column(Text)