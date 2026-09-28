"use client";
import { useState, useEffect } from "react";

const ML_API = "http://localhost:8000";

interface PredictionRecord {
    id: string;
    timestamp: string;
    input: Record<string, number>;
    price: number;
}

export default function PredictPage() {
    const [result, setResult] = useState<number | null>(null);
    const [history, setHistory] = useState<PredictionRecord[]>([]);
    const [compareList, setCompareList] = useState<PredictionRecord[]>([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // 加载历史记录
    useEffect(() => {
        const saved = localStorage.getItem("prediction_history");
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    // 保存到历史
    const saveToHistory = (data: Record<string,number>, price: number) => {
        const newRecord: PredictionRecord = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString("zh-CN"),
            input: data,
            price,
        };
        const updated = [newRecord, ...history].slice(0, 20); // 保留最近20条
        setHistory(updated);
        localStorage.setItem("prediction_history", JSON.stringify(updated));
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true); setResult(null); setErrorMsg("");

        const fd = new FormData(e.currentTarget);
        const input = {
            square_footage: Number(fd.get("squareFootage")),
            bedrooms: Number(fd.get("bedrooms")),
            bathrooms: Number(fd.get("bathrooms")),
            year_built: Number(fd.get("yearBuilt")),
            lot_size: Number(fd.get("lotSize")),
            distance_to_city_center: Number(fd.get("distanceToCityCenter")),
            school_rating: Number(fd.get("schoolRating")),
        };

        try {
            const res = await fetch(`${ML_API}/predict/batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ houses: [input] }),
            });
            if (!res.ok) throw new Error(`服务异常: ${res.status}`);
            const data = await res.json();
            const price = data.results[0].predicted_price;
            setResult(price);
            saveToHistory(input, price);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "未知错误");
        } finally { setLoading(false); }
    }

    const addToCompare = (r: PredictionRecord) => {
        if (compareList.length >= 3) return alert("最多对比3套");
        if (compareList.find(x => x.id === r.id)) return;
        setCompareList([...compareList, r]);
    };

    const removeCompare = (id: string) =>
        setCompareList(compareList.filter(x => x.id !== id));

    const clearHistory = () => {
        localStorage.removeItem("prediction_history");
        setHistory([]);
    };

    return (
        <div className="space-y-8">
            {/* 预测表单 */}
            <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow">
                <h1 className="text-2xl font-bold mb-6 text-center">房价预测</h1>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {[
                        ["squareFootage","建筑面积"],["bedrooms","卧室数"],["bathrooms","浴室数"],
                        ["yearBuilt","建造年份"],["lotSize","地块面积"],["distanceToCityCenter","距市中心km"],
                        ["schoolRating","学区评分0-10"]
                    ].map(([key,label]) => (
                        <div key={key}>
                            <label className="block text-sm font-medium mb-1">{label}</label>
                            <input name={key} type="number" step="any" required
                                   className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    ))}
                    <button type="submit" disabled={loading}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">
                        {loading ? "计算中..." : "开始预测"}
                    </button>
                </form>

                {errorMsg && <p className="mt-4 text-red-600 bg-red-50 p-3 rounded">{errorMsg}</p>}
                {result && (
                    <div className="mt-6 p-5 bg-green-50 rounded-lg text-center">
                        <p className="text-sm text-slate-500">预测价格</p>
                        <p className="text-3xl font-bold text-green-700">¥{result.toLocaleString()}</p>
                    </div>
                )}
            </div>

            {/* 对比区 */}
            {compareList.length > 0 && (
                <section className="bg-white p-6 rounded-xl shadow">
                    <h2 className="font-semibold mb-4">📊 并排对比 ({compareList.length}/3)</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {compareList.map(r => (
                            <div key={r.id} className="border rounded-lg p-3 relative">
                                <button onClick={() => removeCompare(r.id)}
                                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500">×</button>
                                <p className="text-xs text-slate-400">{r.timestamp}</p>
                                <p className="font-bold text-lg mt-1">¥{r.price.toLocaleString()}</p>
                                <div className="text-xs text-slate-500 mt-2 space-y-1">
                                    <p>面积: {r.input.square_footage} ㎡</p>
                                    <p>学区: {r.input.school_rating}</p>
                                    <p>卧室: {r.input.bedrooms}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 历史记录 */}
            <section className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold">🕐 历史记录 ({history.length})</h2>
                    <button onClick={clearHistory} className="text-sm text-red-500 hover:text-red-600">清空</button>
                </div>
                {history.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">暂无记录</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                            <tr>
                                <th className="p-2 text-left">时间</th>
                                <th className="p-2 text-left">面积</th>
                                <th className="p-2 text-left">学区</th>
                                <th className="p-2 text-right">预测价格</th>
                                <th className="p-2 text-center">操作</th>
                            </tr>
                            </thead>
                            <tbody>
                            {history.map(r => (
                                <tr key={r.id} className="border-b last:border-b-0">
                                    <td className="p-2 text-xs">{r.timestamp}</td>
                                    <td className="p-2">{r.input.square_footage}㎡</td>
                                    <td className="p-2">{r.input.school_rating}</td>
                                    <td className="p-2 text-right font-medium">¥{r.price.toLocaleString()}</td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => addToCompare(r)}
                                                className="text-blue-500 hover:text-blue-600 text-xs">加入对比</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}