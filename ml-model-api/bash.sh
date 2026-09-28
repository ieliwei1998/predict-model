pip install -r requirements.txt
python prepare_data.py   # ✅ 直接读data/house_data.xlsx
uvicorn app.main:app --reload
# 访问 http://localhost:8000/docs 测试