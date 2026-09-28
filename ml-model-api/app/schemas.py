from pydantic import BaseModel, Field
from typing import List

class HouseFeatures(BaseModel):
    square_footage: float = Field(gt=0)
    bedrooms: int = Field(ge=1, le=10)
    bathrooms: float = Field(ge=0.5, le=10)
    year_built: int = Field(gt=1900, lt=2030)
    lot_size: float = Field(gt=0)
    distance_to_city_center: float = Field(gt=0)
    school_rating: float = Field(ge=0, le=10)

class BatchPredictionRequest(BaseModel):
    houses: List[HouseFeatures]

class SinglePrediction(BaseModel):
    predicted_price: float
    input_features: HouseFeatures

class ModelInfo(BaseModel):
    model_type: str
    feature_names: List[str]
    coefficients: List[float]
    intercept: float
    performance: dict