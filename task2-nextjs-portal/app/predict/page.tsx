"use client";
import { useState, useEffect, useRef } from "react";

const ML_API = "http://localhost:8000";

interface PredictionRecord {
    id: string;
    timestamp: string;
    input: {
        square_footage: number;
        bedrooms: number;
        bathrooms: number;
        year_built: number;
        lot_size: number;
        distance_to_city_center: number;
        school_rating: number;
    };
    price: number;
}

// 字段校验规则
const FIELD_RULES: Record<string, { min: number; max: number; label: string }> = {
    squareFootage:      { min: 100,  max: 10000, label: "建筑面积" },
    bedrooms:           { min: 1,    max: 20,    label: "卧室数" },
    bathrooms:          { min: 0.5,  max: 10,    label: "浴室数" },
    yearBuilt:          { min: 1900, max: new Date().getFullYear(), label: "建造年份" },
    lotSize:            { min: 100,  max: 50000, label: "地块面积" },
    distanceToCityCenter: { min: 0,   max: 100,   label: "距市中心距离" },
    schoolRating:       { min: 0,    max: 10,     label: "学区评分" },
};

export default function PredictPage() {
    const [result, setResult] = useState<number | null>(null);
    const [history, setHistory] = useState<PredictionRecord[]>([]);
    const [compareList, setCompareList] = useState<PredictionRecord[]>([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // 防重复提交
    const isSubmitting = useRef(false);

    // 加载历史记录
    useEffect(() => {
        try {
            const saved = localStorage.getItem("prediction_history");
            if (saved) setHistory(JSON.parse(saved));
        } catch {
            localStorage.removeItem("prediction_history");
        }
    }, []);

    // 保存到历史
    const saveToHistory = (input: PredictionRecord["input"], price: number) => {
        const newRecord: PredictionRecord = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString("zh-CN"),
            input,
            price,
        };
        const updated = [newRecord, ...history].slice(0, 20);
        setHistory(updated);
        localStorage.setItem("prediction_history", JSON.stringify(updated));
    };

    // ========== 核心：单字段校验 ==========
    const validateField = (name: string, value: number): string => {
        const rule = FIELD_RULES[name];
        if (!rule) return "";

        if (Number.isNaN(value) || value === null || value === undefined) {
            return `${rule.label}不能为空或非有效数字`;
        }
        if (value < rule.min) {
            return `${rule.label}不能小于 ${rule.min}`;
        }
        if (value > rule.max) {
            return `${rule.label}不能大于 ${rule.max}`;
        }
        return "";
    };

    // ========== 整体表单校验 ==========
    const validateForm = (fd: FormData): { valid: boolean; errors: Record<string, string>; input: PredictionRecord["input"] | null } => {
        const errors: Record<string, string> = {};

        const squareFootage = Number(fd.get("squareFootage"));
        const bedrooms = Number(fd.get("bedrooms"));
        const bathrooms = Number(fd.get("bathrooms"));
        const yearBuilt = Number(fd.get("yearBuilt"));
        const lotSize = Number(fd.get("lotSize"));
        const distanceToCityCenter = Number(fd.get("distanceToCityCenter"));
        const schoolRating = Number(fd.get("schoolRating"));

        errors.squareFootage = validateField("squareFootage", squareFootage);
        errors.bedrooms = validateField("bedrooms", bedrooms);
        errors.bathrooms = validateField("bathrooms", bathrooms);
        errors.yearBuilt = validateField("yearBuilt", yearBuilt);
        errors.lotSize = validateField("lotSize", lotSize);
        errors.distanceToCityCenter = validateField("distanceToCityCenter", distanceToCityCenter);
        errors.schoolRating = validateField("schoolRating", schoolRating);

        // 过滤掉空错误
        const hasError = Object.values(errors).some(msg => msg !== "");
        if (hasError) {
            return { valid: false, errors, input: null };
        }

        return {
            valid: true,
            errors: {},
            input: {
                square_footage: squareFootage,
                bedrooms,
                bathrooms,
                year_built: yearBuilt,
                lot_size: lotSize,
                distance_to_city_center: distanceToCityCenter,
                school_rating: schoolRating,
            },
        };
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        // 防重复提交
        if (isSubmitting.current || loading) return;
        isSubmitting.current = true;

        setLoading(true);
        setResult(null);
        setErrorMsg("");
        setFieldErrors({});

        const fd = new FormData(e.currentTarget);

        // 执行校验
        const { valid, errors, input } = validateForm(fd);
        if (!valid) {
            setFieldErrors(errors);
            setErrorMsg("请修正以下输入错误后重试");
            setLoading(false);
            isSubmitting.current = false;
            return;
        }

        try {
            const res = await fetch(`${ML_API}/predict/batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ houses: [input!] }),
            });

            if (!res.ok) {
                if (res.status === 422) {
                    throw new Error("参数格式校验失败，请检查输入数值是否在合理范围");
                }
                throw new Error(`服务异常: ${res.status}`);
            }

            const data = await res.json();
            if (!data.results?.[0]?.predicted_price) {
                throw new Error("返回数据格式异常");
            }

            const price = data.results[0].predicted_price;
            setResult(price);
            saveToHistory(input!, price);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "未知错误");
        } finally {
            setLoading(false);
            isSubmitting.current = false;
        }
    }

    const addToCompare = (r: PredictionRecord) => {
        if (compareList.length >= 3) return alert("最多对比3套");
        if (compareList.some(x => x.id === r.id)) return alert("已在对比列表中");
        setCompareList([...compareList, r]);
    };

    const removeCompare = (id: string) => {
        setCompareList(compareList.filter(x => x.id !== id));
    };

    const clearHistory = () => {
        if (!confirm("确定清空全部历史记录吗？")) return;
        localStorage.removeItem("prediction_history");
        setHistory([]);
        setCompareList([]);
    };

    // 实时单字段失焦校验
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const num = Number(value);
        const msg = validateField(name, num);
        setFieldErrors(prev => ({
            ...prev,
            [name]: msg,
        }));
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-4">
            {/* 预测表单 */}
            <div className="bg-white p-6 rounded-xl shadow">
                <h1 className="text-2xl font-bold mb-6 text-center">🏠 房价预测</h1>
                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                    {[
                        ["squareFootage", "建筑面积 (100–10000 平方英尺)"],
                        ["bedrooms", "卧室数 (1–20)"],
                        ["bathrooms", "浴室数 (0.5–10)"],
                        ["yearBuilt", "建造年份 (1900–至今)"],
                        ["lotSize", "地块面积 (100–50000 平方英尺)"],
                        ["distanceToCityCenter", "距市中心距离 (0–100 km)"],
                        ["schoolRating", "学区评分 (0–10)"],
                    ].map(([key, label]) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                            <input
                                name={key}
                                type="number"
                                step="any"
                                required
                                onBlur={handleBlur}
                                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                    fieldErrors[key] ? "border-red-500 bg-red-50" : "border-slate-300"
                                }`}
                            />
                            {fieldErrors[key] && (
                                <p className="mt-1 text-sm text-red-500">{fieldErrors[key]}</p>
                            )}
                        </div>
                    ))}

                    {errorMsg && !Object.keys(fieldErrors).length && (
                        <p className="mt-4 text-red-600 bg-red-50 p-3 rounded">{errorMsg}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 mt-2"
                    >
                        {loading ? "计算中..." : "开始预测"}
                    </button>
                </form>

                {result !== null && (
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {compareList.map(r => (
                            <div key={r.id} className="border rounded-lg p-3 relative">
                                <button
                                    onClick={() => removeCompare(r.id)}
                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                                >
                                    ×
                                </button>
                                <p className="text-xs text-slate-400">{r.timestamp}</p>
                                <p className="font-bold text-lg mt-1 text-green-700">¥{r.price.toLocaleString()}</p>
                                <div className="text-xs text-slate-500 mt-2 space-y-1">
                                    <p>面积: {r.input.square_footage} sqft</p>
                                    <p>学区: {r.input.school_rating}</p>
                                    <p>卧室: {r.input.bedrooms}</p>
                                    <p>浴室: {r.input.bathrooms}</p>
                                    <p>建造年份: {r.input.year_built}</p>
                                    <p>距市区: {r.input.distance_to_city_center} km</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 历史记录 */}
            <section className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold">🕐 历史记录 ({history.length}/20)</h2>
                    <button
                        onClick={clearHistory}
                        className="text-sm text-red-500 hover:text-red-600"
                    >
                        清空全部
                    </button>
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
                                <th className="p-2 text-left">卧室</th>
                                <th className="p-2 text-right">预测价格</th>
                                <th className="p-2 text-center">操作</th>
                            </tr>
                            </thead>
                            <tbody>
                            {history.map(r => (
                                <tr key={r.id} className="border-b last:border-b-0 hover:bg-slate-50">
                                    <td className="p-2 text-xs">{r.timestamp}</td>
                                    <td className="p-2">{r.input.square_footage} sqft</td>
                                    <td className="p-2">{r.input.school_rating}</td>
                                    <td className="p-2">{r.input.bedrooms}</td>
                                    <td className="p-2 text-right font-medium text-green-700">
                                        ¥{r.price.toLocaleString()}
                                    </td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => addToCompare(r)}
                                            className="text-blue-500 hover:text-blue-600 text-xs"
                                        >
                                            加入对比
                                        </button>
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