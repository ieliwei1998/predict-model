from typing import List

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import os
import pickle

BASE_DIR = os.path.dirname(__file__)
EXCEL_PATH = os.path.join(BASE_DIR, "..", "data", "house_data.xlsx")
MODEL_PATH = os.path.join(BASE_DIR, "..", "model.pkl")

FEATURE_COLS = [
    "square_footage", "bedrooms", "bathrooms", "year_built",
    "lot_size", "distance_to_city_center", "school_rating"
]
TARGET_COL = "price"

COL_MAP = {
    "建筑面积": "square_footage", "卧室数": "bedrooms", "浴室数": "bathrooms",
    "建造年份": "year_built", "地块面积": "lot_size", "距市中心距离": "distance_to_city_center",
    "学区评分": "school_rating", "价格": "price", "房价": "price"
}


def _standardize_cols(df):
    df = df.rename(columns=COL_MAP)
    for c in FEATURE_COLS + [TARGET_COL]:
        if c not in df.columns:
            raise ValueError(f"Excel缺少列: {c}")
    return df


class HousePriceModel:
    def __init__(self):
        self.model = None
        self.df = None
        self._load_or_train()

    def _load_or_train(self):
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, "rb") as f:
                self.model = pickle.load(f)
            self.df = pd.read_excel(EXCEL_PATH)
            self.df = _standardize_cols(self.df)
            return
        self._train()

    def _train(self):
        self.df = pd.read_excel(EXCEL_PATH)
        self.df = _standardize_cols(self.df).dropna()
        print(f" 读取Excel成功: {len(self.df)} 条数据")

        x = self.df[FEATURE_COLS]
        y = self.df[TARGET_COL]
        x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)

        self.model = LinearRegression()
        self.model.fit(x_train, y_train)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self.model, f)
        print(" 模型训练完成并保存")

    def predict_single(self, features: dict) -> float:
        x = pd.DataFrame([[features[name] for name in FEATURE_COLS]], columns=FEATURE_COLS)
        return round(float(self.model.predict(x)[0]), 2)

    def predict_batch(self, features_list: List[dict]) -> List[float]:
        x = pd.DataFrame([[f[name] for name in FEATURE_COLS] for f in features_list], columns=FEATURE_COLS)
        return [round(float(p), 2) for p in self.model.predict(x)]

    def get_model_info(self) -> dict:
        x = self.df[FEATURE_COLS]
        y = self.df[TARGET_COL]
        x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)
        y_pred = self.model.predict(x_train)
        return {
            "model_type": "Linear Regression",
            "feature_names": FEATURE_COLS,
            "coefficients": [round(c, 4) for c in self.model.coef_],
            "intercept": round(float(self.model.intercept_), 2),
            "performance": {
                "r2_score": round(r2_score(y_test, y_pred), 4),
                "rmse": round(np.sqrt(mean_squared_error(y_test, y_pred)), 2),
                "mae": round(mean_absolute_error(y_test, y_pred), 2)
            }
        }

model = HousePriceModel()