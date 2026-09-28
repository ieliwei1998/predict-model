import os
import shutil

BASE_DIR = os.path.dirname(__file__)
EXCEL_PATH = os.path.join(BASE_DIR, "data", "house_data.xlsx")

if not os.path.exists(EXCEL_PATH):
    print("="*50)
    print(f"请将Excel文件放到: {EXCEL_PATH}")
    print("列名支持中英文:")
    print("  建筑面积/square_footage, 卧室数/bedrooms, 浴室数/bathrooms")
    print("  建造年份/year_built, 地块面积/lot_size, 距市中心距离/distance_to_city_center")
    print("  学区评分/school_rating, 价格/price")
    print("="*50)
    raise FileNotFoundError(f"缺少文件: {EXCEL_PATH}")

# 删除旧模型，强制重训
model_file = os.path.join(BASE_DIR, "model.pkl")
if os.path.exists(model_file):
    os.remove(model_file)
    print(" 旧模型已删除，将重新训练...")

from app.model import model
info = model.get_model_info()
print(f" 就绪！R²={info['performance']['r2_score']}")
print(f" API文档: http://localhost:8000/docs")