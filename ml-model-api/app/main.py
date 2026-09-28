from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import HouseFeatures, BatchPredictionRequest, SinglePrediction, ModelInfo
from .model import model

from pydantic import BaseModel, Field
from typing import List, Optional, Any

app = FastAPI(title="Task1 — ML API", version="1.0.0")

# ✅ 允许前端直接跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== 1. 请求/响应模型定义 ==========
class HouseFeatures(BaseModel):
    square_footage: float = Field(..., description="建筑面积（平方英尺）", example=1500.0)
    bedrooms: int = Field(..., description="卧室数量", example=3)
    bathrooms: float = Field(..., description="卫生间数量", example=2.0)
    year_built: int = Field(..., description="建造年份", example=1995)
    lot_size: float = Field(..., description="地块面积", example=5000.0)
    distance_to_city_center: float = Field(..., description="距市区距离(km)", example=5.0)
    school_rating: float = Field(..., description="学区评分 0-10", example=7.5)


class BatchPredictionRequest(BaseModel):
    houses: List[HouseFeatures] = Field(..., description="待预测的房屋特征列表")


class SinglePredictionResult(BaseModel):
    predicted_price: float = Field(..., description="预测房价", example=225122.46)
    input_features: HouseFeatures = Field(..., description="对应的输入特征")


class BatchPredictionResponse(BaseModel):
    results: List[SinglePredictionResult] = Field(..., description="批量预测结果列表")


class ModelInfoResponse(BaseModel):
    model_type: str = Field(..., description="模型类型", example="LinearRegression")
    features: List[str] = Field(..., description="使用的特征列表")
    coefficients: Optional[dict] = Field(None, description="模型系数（如有）")
    performance: dict = Field(..., description="评估指标 R2/MSE等")
    trained_samples: int = Field(..., description="训练样本数", example=1200)


class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    service: str = Field(..., example="task1-ml-api")


# ========== 2. 接口实现（添加 response_model） ==========
@app.get("/health", response_model=HealthResponse, summary="服务健康检查")
async def health():
    return {"status": "healthy", "service": "task1-ml-api"}


@app.post("/predict/batch", response_model=BatchPredictionResponse, summary="批量房价预测")
async def predict_batch(req: BatchPredictionRequest):
    try:
        features = [h.model_dump() for h in req.houses]
        prices = model.predict_batch(features)  # 你的模型方法

        return {
            "results": [
                {
                    "predicted_price": p,
                    "input_features": h
                }
                for p, h in zip(prices, req.houses)
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model-info", response_model=ModelInfoResponse, summary="模型信息与性能指标")
async def model_info():
    try:
        info = model.get_model_info()  # 确保返回结构匹配 ModelInfoResponse
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
