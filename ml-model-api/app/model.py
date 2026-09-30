from typing import List, Dict, Optional
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


def _standardize_cols(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns=COL_MAP)
    for c in FEATURE_COLS + [TARGET_COL]:
        if c not in df.columns:
            raise ValueError(f"Excel缺少必须列: {c}")
    return df


class HousePriceModel:
    def __init__(self):
        self.model: Optional[LinearRegression] = None
        self.df: Optional[pd.DataFrame] = None
        self.performance_metrics: Optional[Dict] = None
        self._load_or_train()

    def _load_or_train(self):
        # 如果模型文件存在：加载模型与已经保存好的指标，不再重读Excel算指标
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    saved_data = pickle.load(f)
                self.model = saved_data["model"]
                self.performance_metrics = saved_data["metrics"]
                self.df = pd.read_excel(EXCEL_PATH)
                self.df = _standardize_cols(self.df).dropna()
                print("成功加载已保存模型 model.pkl")
                print("⚠️注意：修改Excel数据源后，请删除model.pkl触发重新训练！")
                return
            except Exception as e:
                raise RuntimeError(f"加载模型失败: {str(e)}")

        self._train()

    def _train(self):
        if not os.path.exists(EXCEL_PATH):
            raise FileNotFoundError(f"数据源文件不存在：{EXCEL_PATH}")

        self.df = pd.read_excel(EXCEL_PATH)
        self.df = _standardize_cols(self.df).dropna()
        print(f"读取Excel成功: {len(self.df)} 条有效数据")

        x = self.df[FEATURE_COLS]
        y = self.df[TARGET_COL]
        x_train, x_test, y_train, y_test = train_test_split(
            x, y, test_size=0.2, random_state=42
        )

        self.model = LinearRegression()
        self.model.fit(x_train, y_train)

        # 同时计算训练集、测试集指标，方便观察过拟合
        y_train_pred = self.model.predict(x_train)
        y_test_pred = self.model.predict(x_test)

        self.performance_metrics = {
            "train_r2": round(r2_score(y_train, y_train_pred), 4),#决定系数
            "test_r2": round(r2_score(y_test, y_test_pred), 4),#决定系数
            "test_rmse": round(np.sqrt(mean_squared_error(y_test, y_test_pred)), 2),#均方根误差 Root Mean Squared Error
            "test_mae": round(mean_absolute_error(y_test, y_test_pred), 2)#平均绝对误差 Mean Absolute Error
        }

        # pickle保存模型 + 训练当时的指标
        save_payload = {
            "model": self.model,
            "metrics": self.performance_metrics
        }
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(save_payload, f)
        print("模型训练完成并保存 model.pkl")

    @staticmethod
    def _validate_feature_dict(feat: Dict):
        """简单业务数值校验"""
        rules = {
            "square_footage": (100, 10000),
            "bedrooms": (1, 10),
            "bathrooms": (1, 8),
            "year_built": (1900, 2030),
            "lot_size": (500, 50000),
            "distance_to_city_center": (0, 100),
            "school_rating": (1.0, 10.0)
        }
        for key, (min_v, max_v) in rules.items():
            val = feat[key]
            if not (min_v <= val <= max_v):
                raise ValueError(f"{key}={val} 超出业务范围 [{min_v}, {max_v}]")

    def predict_single(self, features: Dict) -> float:
        for col in FEATURE_COLS:
            if col not in features:
                raise KeyError(f"缺少输入字段：{col}")
        self._validate_feature_dict(features)
        x = pd.DataFrame([[features[name] for name in FEATURE_COLS]], columns=FEATURE_COLS)
        return round(float(self.model.predict(x)[0]), 2)

    def predict_batch(self, features_list: List[Dict]) -> List[float]:
        for feat in features_list:
            for col in FEATURE_COLS:
                if col not in feat:
                    raise KeyError(f"样本缺少输入字段：{col}")
            self._validate_feature_dict(feat)
        x = pd.DataFrame([[f[name] for name in FEATURE_COLS] for f in features_list], columns=FEATURE_COLS)
        return [round(float(p), 2) for p in self.model.predict(x)]

    def get_model_info(self) -> Dict:
        coef_dict = dict(zip(FEATURE_COLS, [round(c, 4) for c in self.model.coef_]))
        return {
            "model_type": "Linear Regression",
            "feature_names": FEATURE_COLS,
            "coefficients": coef_dict,
            "intercept": round(float(self.model.intercept_), 2),
            "performance": self.performance_metrics
        }


# 全局单例，模块导入就初始化；Demo可用，生产建议改成lazy懒加载
model = HousePriceModel()

if __name__ == "__main__":
    info = model.get_model_info()
    print("model info:", info)
    test_house = {
        "square_footage": 1800,
        "bedrooms": 3,
        "bathrooms": 2,
        "year_built": 2000,
        "lot_size": 6000,
        "distance_to_city_center": 8,
        "school_rating": 7.5
    }
    print("single predict:", model.predict_single(test_house))
    print("batch predict:", model.predict_batch([test_house]))
