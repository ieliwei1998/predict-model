"use client";
import { useState, useEffect } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const JAVA_API = "http://localhost:8080/api";

const DEFAULTS = {
    squareFootage: 1500, bedrooms: 3, bathrooms: 2.0,
    yearBuilt: 1995, lotSize: 5000, distanceToCityCenter: 5.0, schoolRating: 7.5,
} as const;

// ===== 参数校验规则配置 =====
const VALID_RULES = {
    squareFootage: { min: 10, max: 10000, label: "建筑面积" },
    bedrooms: { min: 1, max: 20, label: "卧室数量" },
    bathrooms: { min: 0.5, max: 10, label: "卫生间数量" },
    yearBuilt: { min: 1900, max: new Date().getFullYear(), label: "建造年份" },
    lotSize: { min: 50, max: 50000, label: "地块面积" },
    distanceToCityCenter: { min: 0, max: 100, label: "距市区距离" },
    schoolRating: { min: 0, max: 10, label: "学区评分" },
    price: { min: 0, max: 999999999, label: "价格" },
} as const;

// ===== 通用校验函数 =====
function validateField(value: number | null | undefined, fieldKey: keyof typeof VALID_RULES): string | null {
    if (value === null || value === undefined || isNaN(value)) {
        return `${VALID_RULES[fieldKey].label}不能为空或非法数值`;
    }
    const rule = VALID_RULES[fieldKey];
    if (value < rule.min) return `${rule.label}不能小于 ${rule.min}`;
    if (value > rule.max) return `${rule.label}不能大于 ${rule.max}`;
    return null;
}

function validateRange(minVal: number | null | undefined, maxVal: number | null | undefined, fieldLabel: string): string | null {
    if (minVal !== null && minVal !== undefined && !isNaN(minVal) &&
        maxVal !== null && maxVal !== undefined && !isNaN(maxVal) &&
        minVal > maxVal) {
        return `${fieldLabel}的最小值不能大于最大值`;
    }
    return null;
}

export default function AnalysisPage() {
    const [filters, setFilters] = useState({
        minBedrooms: "", maxBedrooms: "",
        minSchoolRating: "",
        minPrice: "", maxPrice: "",
        minSqft: "", maxSqft: "",
        minDistance: "", maxDistance: "",
    });

    const [houseList, setHouseList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [sortKey, setSortKey] = useState<string>("price");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [whatIfResult, setWhatIfResult] = useState<any>(null);
    const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

    useEffect(() => {
        fetchHouseList();
    }, [filters]);

    const fetchHouseList = async () => {
        setLoading(true);
        setErrorMsg("");
        setValidationWarnings([]);

        // ===== 筛选条件校验 =====
        const warnings: string[] = [];
        const minBed = filters.minBedrooms ? Number(filters.minBedrooms) : null;
        const maxBed = filters.maxBedrooms ? Number(filters.maxBedrooms) : null;
        const minRating = filters.minSchoolRating ? Number(filters.minSchoolRating) : null;
        const minP = filters.minPrice ? Number(filters.minPrice) : null;
        const maxP = filters.maxPrice ? Number(filters.maxPrice) : null;
        const minSq = filters.minSqft ? Number(filters.minSqft) : null;
        const maxSq = filters.maxSqft ? Number(filters.maxSqft) : null;
        const minDist = filters.minDistance ? Number(filters.minDistance) : null;
        const maxDist = filters.maxDistance ? Number(filters.maxDistance) : null;

        if (minBed !== null) {
            const err = validateField(minBed, "bedrooms");
            if (err) warnings.push(`【卧室下限】${err}`);
        }
        if (maxBed !== null) {
            const err = validateField(maxBed, "bedrooms");
            if (err) warnings.push(`【卧室上限】${err}`);
        }
        if (minRating !== null) {
            const err = validateField(minRating, "schoolRating");
            if (err) warnings.push(`【最低学区评分】${err}`);
        }
        if (minP !== null) {
            const err = validateField(minP, "price");
            if (err) warnings.push(`【最低价格】${err}`);
        }
        if (maxP !== null) {
            const err = validateField(maxP, "price");
            if (err) warnings.push(`【最高价格】${err}`);
        }
        if (minSq !== null) {
            const err = validateField(minSq, "squareFootage");
            if (err) warnings.push(`【建筑面积下限】${err}`);
        }
        if (maxSq !== null) {
            const err = validateField(maxSq, "squareFootage");
            if (err) warnings.push(`【建筑面积上限】${err}`);
        }
        if (minDist !== null) {
            const err = validateField(minDist, "distanceToCityCenter");
            if (err) warnings.push(`【距离下限】${err}`);
        }
        if (maxDist !== null) {
            const err = validateField(maxDist, "distanceToCityCenter");
            if (err) warnings.push(`【距离上限】${err}`);
        }

        const rangeChecks = [
            validateRange(minBed, maxBed, "卧室数量"),
            validateRange(minP, maxP, "价格"),
            validateRange(minSq, maxSq, "建筑面积"),
            validateRange(minDist, maxDist, "距市区距离"),
        ];
        rangeChecks.forEach(e => { if (e) warnings.push(e); });

        if (warnings.length > 0) {
            setValidationWarnings(warnings);
            setLoading(false);
            return;
        }

        try {
            const body: any = {};
            if (filters.minBedrooms) body.minBedrooms = minBed;
            if (filters.maxBedrooms) body.maxBedrooms = maxBed;
            if (filters.minSchoolRating) body.minSchoolRating = minRating;
            if (filters.minPrice) body.minPrice = minP;
            if (filters.maxPrice) body.maxPrice = maxP;
            if (filters.minSqft) body.minSqft = minSq;
            if (filters.maxSqft) body.maxSqft = maxSq;
            if (filters.minDistance) body.minDistance = minDist;
            if (filters.maxDistance) body.maxDistance = maxDist;

            const res = await fetch(`${JAVA_API}/analysis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: Object.keys(body).length > 0 ? JSON.stringify(body) : "{}"
            });

            if (!res.ok) throw new Error(`请求失败: ${res.status}`);
            setHouseList(await res.json());
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "加载失败");
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilters({
            minBedrooms: "", maxBedrooms: "",
            minSchoolRating: "",
            minPrice: "", maxPrice: "",
            minSqft: "", maxSqft: "",
            minDistance: "", maxDistance: "",
        });
        setValidationWarnings([]);
    };

    const sortedList = [...houseList].sort((a, b) => {
        const valA = a[sortKey] ?? 0;
        const valB = b[sortKey] ?? 0;
        return (valA - valB) * (sortDir === "asc" ? 1 : -1);
    });

    const toggleSort = (key: string) => {
        setSortKey(key);
        setSortDir(prev => sortKey === key ? (prev === "asc" ? "desc" : "asc") : "desc");
    };

    const exportCSV = () => {
        const headers = ["价格","建筑面积(平方英尺)","卧室","卫生间","建造年份","地块面积(平方英尺)","距市区(km)","学区评分"];
        const rows = sortedList.map(r => [
            r.price, r.squareFootage, r.bedrooms, r.bathrooms,
            r.yearBuilt, r.lotSize, r.distanceToCityCenter, r.schoolRating
        ]);
        const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `房源列表_${new Date().toLocaleDateString()}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = async () => {
        if (sortedList.length === 0) {
            alert("暂无数据可导出");
            return;
        }


        try {
            // 改用内置支持中文的字体配置方式
            const doc = new jsPDF("p", "mm", "a4");
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            let yPos = margin;

            // ========== 标题 ==========
            doc.setFontSize(18);
            doc.text("Property Market Analysis Report", pageWidth / 2, yPos, { align: "center" });
            yPos += 8;

            doc.setFontSize(10);
            doc.text(`Exported: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: "center" });
            yPos += 8;

            // ========== 筛选条件 ==========
            doc.setFontSize(12);
            doc.text("Filter Conditions", margin, yPos);
            yPos += 6;
            doc.setFontSize(10);

            const filterLines: string[] = [];
            if (filters.minBedrooms || filters.maxBedrooms)
                filterLines.push(`Bedrooms: ${filters.minBedrooms || "Any"} ~ ${filters.maxBedrooms || "Any"}`);
            if (filters.minSchoolRating)
                filterLines.push(`Min School Rating: ${filters.minSchoolRating}`);
            if (filters.minPrice || filters.maxPrice)
                filterLines.push(`Price: ${filters.minPrice || "Any"} ~ ${filters.maxPrice || "Any"}`);
            if (filters.minSqft || filters.maxSqft)
                filterLines.push(`Area: ${filters.minSqft || "Any"} ~ ${filters.maxSqft || "Any"} sqft`);
            if (filters.minDistance || filters.maxDistance)
                filterLines.push(`Distance to City: ${filters.minDistance || "Any"} ~ ${filters.maxDistance || "Any"} km`);
            if (filterLines.length === 0) filterLines.push("No filters applied");

            filterLines.forEach(line => {
                doc.text(`- ${line}`, margin + 3, yPos);
                yPos += 5;
            });
            yPos += 4;

            // ========== 统计摘要 ==========
            const prices = sortedList.map(r => r.price || 0);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            doc.setFontSize(12);
            doc.text("Summary", margin, yPos);
            yPos += 6;
            doc.setFontSize(10);
            doc.text(
                `Records: ${sortedList.length} | Avg: ¥${avgPrice.toLocaleString(undefined, {maximumFractionDigits:0})} | Min: ¥${minPrice.toLocaleString()} | Max: ¥${maxPrice.toLocaleString()}`,
                margin + 3, yPos
            );
            yPos += 8;

            // ========== 数据表格 ==========
            const tableHead = [
                ["Price", "Area", "Bedrooms", "Baths", "Year", "Lot Size", "Dist(km)", "School Rate"]
            ];
            const tableBody = sortedList.map(r => [
                `¥${(r.price || 0).toLocaleString()}`,
                String(r.squareFootage || "-"),
                String(r.bedrooms || "-"),
                String(r.bathrooms || "-"),
                String(r.yearBuilt || "-"),
                String(r.lotSize || "-"),
                String(r.distanceToCityCenter || "-"),
                String(r.schoolRating || "-"),
            ]);

            autoTable(doc, {
                startY: yPos,
                head: tableHead,
                body: tableBody,
                theme: "grid",
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    font: "helvetica", // 使用内置字体，避免乱码
                },
                headStyles: {
                    fillColor: [59, 130, 246],
                    textColor: 255,
                    fontStyle: "bold",
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: margin, right: margin },
            });

            doc.save(`Property_Report_${new Date().toLocaleDateString()}.pdf`);
        } catch (e) {
            setErrorMsg("PDF export failed, please retry");
            console.error(e);
        } finally {

        }
    };


    const syncBaseToNew = () => {
        const form = document.querySelector("form[name='whatIfForm']") as HTMLFormElement;
        if (!form) return;
        ["SquareFootage","Bedrooms","Bathrooms","YearBuilt","LotSize","DistanceToCityCenter","SchoolRating"].forEach(f => {
            const base = form.querySelector(`[name="base${f}"]`) as HTMLInputElement;
            const newVal = form.querySelector(`[name="new${f}"]`) as HTMLInputElement;
            if (base && newVal) newVal.value = base.value;
        });
        setWhatIfResult(null);
        setErrorMsg("");
        setValidationWarnings([]);
    };

    async function handleWhatIf(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setWhatIfResult(null);
        setErrorMsg("");
        setValidationWarnings([]);

        const fd = new FormData(e.currentTarget);
        const payload: any = {};
        const warnings: string[] = [];

        // ===== 读取并校验基准值 =====
        const baseSqft = Number(fd.get("baseSquareFootage"));
        const baseBed = Number(fd.get("baseBedrooms"));
        const baseBath = Number(fd.get("baseBathrooms"));
        const baseYear = Number(fd.get("baseYearBuilt"));
        const baseLot = Number(fd.get("baseLotSize"));
        const baseDist = Number(fd.get("baseDistanceToCityCenter"));
        const baseRating = Number(fd.get("baseSchoolRating"));

        const baseChecks = [
            validateField(baseSqft, "squareFootage"),
            validateField(baseBed, "bedrooms"),
            validateField(baseBath, "bathrooms"),
            validateField(baseYear, "yearBuilt"),
            validateField(baseLot, "lotSize"),
            validateField(baseDist, "distanceToCityCenter"),
            validateField(baseRating, "schoolRating"),
        ];
        baseChecks.forEach(err => { if (err) warnings.push(`【基准值】${err}`); });

        // ===== 读取并校验新值 =====
        const newSqftRaw = fd.get("newSquareFootage");
        const newBedRaw = fd.get("newBedrooms");
        const newBathRaw = fd.get("newBathrooms");
        const newYearRaw = fd.get("newYearBuilt");
        const newLotRaw = fd.get("newLotSize");
        const newDistRaw = fd.get("newDistanceToCityCenter");
        const newRatingRaw = fd.get("newSchoolRating");

        const newSqft = newSqftRaw && String(newSqftRaw).trim() !== "" ? Number(newSqftRaw) : null;
        const newBed = newBedRaw && String(newBedRaw).trim() !== "" ? Number(newBedRaw) : null;
        const newBath = newBathRaw && String(newBathRaw).trim() !== "" ? Number(newBathRaw) : null;
        const newYear = newYearRaw && String(newYearRaw).trim() !== "" ? Number(newYearRaw) : null;
        const newLot = newLotRaw && String(newLotRaw).trim() !== "" ? Number(newLotRaw) : null;
        const newDist = newDistRaw && String(newDistRaw).trim() !== "" ? Number(newDistRaw) : null;
        const newRating = newRatingRaw && String(newRatingRaw).trim() !== "" ? Number(newRatingRaw) : null;

        if (newSqft !== null) { const e = validateField(newSqft, "squareFootage"); if (e) warnings.push(`【新值-建筑面积】${e}`); }
        if (newBed !== null) { const e = validateField(newBed, "bedrooms"); if (e) warnings.push(`【新值-卧室】${e}`); }
        if (newBath !== null) { const e = validateField(newBath, "bathrooms"); if (e) warnings.push(`【新值-卫生间】${e}`); }
        if (newYear !== null) { const e = validateField(newYear, "yearBuilt"); if (e) warnings.push(`【新值-建造年份】${e}`); }
        if (newLot !== null) { const e = validateField(newLot, "lotSize"); if (e) warnings.push(`【新值-地块面积】${e}`); }
        if (newDist !== null) { const e = validateField(newDist, "distanceToCityCenter"); if (e) warnings.push(`【新值-距市区距离】${e}`); }
        if (newRating !== null) { const e = validateField(newRating, "schoolRating"); if (e) warnings.push(`【新值-学区评分】${e}`); }

        // 校验不通过直接返回
        if (warnings.length > 0) {
            setValidationWarnings(warnings);
            setLoading(false);
            return;
        }

        // 组装 payload
        payload.baseSquareFootage = baseSqft;
        payload.baseBedrooms = baseBed;
        payload.baseBathrooms = baseBath;
        payload.baseYearBuilt = baseYear;
        payload.baseLotSize = baseLot;
        payload.baseDistanceToCityCenter = baseDist;
        payload.baseSchoolRating = baseRating;

        if (newSqft !== null) payload.newSquareFootage = newSqft;
        if (newBed !== null) payload.newBedrooms = newBed;
        if (newBath !== null) payload.newBathrooms = newBath;
        if (newYear !== null) payload.newYearBuilt = newYear;
        if (newLot !== null) payload.newLotSize = newLot;
        if (newDist !== null) payload.newDistanceToCityCenter = newDist;
        if (newRating !== null) payload.newSchoolRating = newRating;

        try {
            const res = await fetch(`${JAVA_API}/what-if`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`请求失败: ${res.status} — ${errText}`);
            }

            setWhatIfResult(await res.json());
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "计算失败");
        } finally {
            setLoading(false);
        }
    }

    // ========== 图表数据准备 ==========
    const priceBySqftData = sortedList.length > 0 ? {
        labels: sortedList.map(i => i.squareFootage || 0),
        datasets: [
            {
                label: "房价 (¥)",
                data: sortedList.map(i => i.price || 0),
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                fill: true,
                tension: 0.3,
            },
        ],
    } : null;

    const bedroomGroups = (() => {
        const map: Record<number, number> = {};
        sortedList.forEach(i => {
            const b = i.bedrooms || 0;
            map[b] = (map[b] || 0) + 1;
        });
        return Object.entries(map)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([bed, count]) => ({ bed: Number(bed), count }));
    })();
    const bedroomChartData = bedroomGroups.length > 0 ? {
        labels: bedroomGroups.map(g => `${g.bed} 卧`),
        datasets: [
            {
                label: "房源数量",
                data: bedroomGroups.map(g => g.count),
                backgroundColor: "rgba(16, 185, 129, 0.7)",
            },
        ],
    } : null;

    const breakdownChartData = whatIfResult?.breakdown ? {
        labels: Object.keys(whatIfResult.breakdown),
        datasets: [
            {
                data: Object.values(whatIfResult.breakdown),
                backgroundColor: [
                    "rgba(239, 68, 68, 0.7)", "rgba(245, 158, 11, 0.7)",
                    "rgba(16, 185, 129, 0.7)", "rgba(59, 130, 246, 0.7)",
                    "rgba(139, 92, 246, 0.7)", "rgba(236, 72, 153, 0.7)",
                    "rgba(99, 102, 241, 0.7)",
                ],
            },
        ],
    } : null;

    const distanceBins = [
        { label: "0-3km", min: 0, max: 3 },
        { label: "3-6km", min: 3, max: 6 },
        { label: "6-10km", min: 6, max: 10 },
        { label: ">10km", min: 10, max: 999 },
    ];
    const distancePriceData = distanceBins.map(bin => {
        const items = sortedList.filter(
            i => (i.distanceToCityCenter || 0) >= bin.min && (i.distanceToCityCenter || 0) < bin.max
        );
        const avgPrice = items.length > 0
            ? items.reduce((sum, i) => sum + (i.price || 0), 0) / items.length
            : 0;
        return { label: bin.label, avgPrice };
    });
    const distanceChartData = sortedList.length > 0 ? {
        labels: distancePriceData.map(d => d.label),
        datasets: [
            {
                label: "平均房价 (¥)",
                data: distancePriceData.map(d => d.avgPrice),
                backgroundColor: "rgba(99, 102, 241, 0.7)",
            },
        ],
    } : null;

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold">🏠 房产市场分析系统 — 预测结果展示</h1>

            {/* 全局校验警告区 */}
            {validationWarnings.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r">
                    <p className="font-medium text-amber-800 mb-2">⚠️ 输入数据校验不通过，请修正以下问题：</p>
                    <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                        {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}

            {/* 筛选器 */}
            <section className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-lg">🔍 筛选条件配置</h2>
                    <button onClick={resetFilters}
                            className="text-sm bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200">
                        重置筛选
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">卧室数量 (1~20)</label>
                        <div className="flex gap-2 items-center">
                            <input type="number" placeholder="最少" value={filters.minBedrooms}
                                   onChange={(e) => setFilters({...filters, minBedrooms: e.target.value})}
                                   className="flex-1 p-2 border rounded text-sm" min="1" max="20" />
                            <span className="text-slate-400">~</span>
                            <input type="number" placeholder="最多" value={filters.maxBedrooms}
                                   onChange={(e) => setFilters({...filters, maxBedrooms: e.target.value})}
                                   className="flex-1 p-2 border rounded text-sm" min="1" max="20" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">最低学区评分 (0~10)</label>
                        <input type="number" step="0.1" placeholder="不限" value={filters.minSchoolRating}
                               onChange={(e) => setFilters({...filters, minSchoolRating: e.target.value})}
                               className="w-full p-2 border rounded text-sm" min="0" max="10" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">价格范围</label>
                        <div className="flex gap-2 items-center">
                            <input type="number" placeholder="最低" value={filters.minPrice}
                                   onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                                   className="flex-1 p-2 border rounded text-sm" min="0" />
                            <span className="text-slate-400">~</span>
                            <input type="number" placeholder="最高" value={filters.maxPrice}
                                   onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                                   className="flex-1 p-2 border rounded text-sm" min="0" />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-600 mb-2">建筑面积 (平方英尺, 10~10000)</label>
                        <div className="flex gap-2 items-center">
                            <input type="number" placeholder="最小" value={filters.minSqft}
                                   onChange={(e) => setFilters({...filters, minSqft: e.target.value})}
                                   className="flex-1 p-2 border rounded text-sm" min="10" max="10000" />
                            <span className="text-slate-400">~</span>
                            <input type="number" placeholder="最大" value={filters.maxSqft}
                                   onChange={(e) => setFilters({...filters, maxSqft: e.target.value})}
                                   className="flex-1 p-2 border rounded text-sm" min="10" max="10000" />
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <label className="block text-sm font-medium text-slate-600 mb-2">到市区距离 (km, 0~100)</label>
                        <div className="flex gap-2 items-center">
                            <input type="number" step="0.1" placeholder="最近" value={filters.minDistance}
                                   onChange={(e) => setFilters({...filters, minDistance: e.target.value})}
                                   className="flex-1 p-2 border rounded text-sm" min="0" max="100" />
                            <span className="text-slate-400">~</span>
                            <input type="number" step="0.1" placeholder="最远" value={filters.maxDistance}
                                   onChange={(e) => setFilters({...filters, maxDistance: e.target.value})}
                                   className="flex-1 p-2 border rounded text-sm" min="0" max="100" />
                        </div>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                    💡 留空 = 不限制该条件；数值超出范围或最小值大于最大值将提示错误
                </p>
            </section>

            {/* ===== 一、表格展示 ===== */}
            <section className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-lg">📋 预测结果 — 表格 ({sortedList.length} 条)</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={exportCSV}
                            className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded hover:bg-emerald-100"
                        >
                            📥 导出CSV
                        </button>
                        <button
                            onClick={exportPDF}

                            className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-100 disabled:opacity-50"
                        >
                           📄 导出PDF
                        </button>
                    </div>
                </div>
                {loading ? (
                    <p className="text-slate-500 text-center py-10">正在加载数据…</p>
                ) : errorMsg ? (
                    <p className="text-red-600 bg-red-50 p-3 rounded">{errorMsg}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-max w-full text-sm">
                            <thead className="bg-slate-50">
                            <tr>
                                {[
                                    { key: "price", label: "预测价格" },
                                    { key: "squareFootage", label: "建筑面积(平方英尺)" },
                                    { key: "bedrooms", label: "卧室" },
                                    { key: "bathrooms", label: "卫生间" },
                                    { key: "yearBuilt", label: "建造年份" },
                                    { key: "lotSize", label: "地块面积(平方英尺)" },
                                    { key: "distanceToCityCenter", label: "距市区(km)" },
                                    { key: "schoolRating", label: "学区评分" },
                                ].map(col => (
                                    <th key={col.key} onClick={() => toggleSort(col.key)}
                                        className="p-3 text-left cursor-pointer hover:bg-slate-100 whitespace-nowrap">
                                        {col.label}
                                        {sortKey === col.key && (sortDir === "asc" ? " ↑" : " ↓")}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {sortedList.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-10 text-center text-slate-400">
                                        暂无符合筛选条件的房源
                                    </td>
                                </tr>
                            ) : (
                                sortedList.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-b-0 hover:bg-slate-50">
                                        <td className="p-3 font-medium whitespace-nowrap text-blue-600">
                                            ¥{item.price?.toLocaleString()}
                                        </td>
                                        <td className="p-3">{item.squareFootage}</td>
                                        <td className="p-3">{item.bedrooms}</td>
                                        <td className="p-3">{item.bathrooms}</td>
                                        <td className="p-3">{item.yearBuilt}</td>
                                        <td className="p-3">{item.lotSize}</td>
                                        <td className="p-3">{item.distanceToCityCenter}</td>
                                        <td className="p-3">{item.schoolRating}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ===== 二、可视化图表展示 ===== */}
            <section className="bg-white p-6 rounded-xl shadow">
                <h2 className="font-semibold text-lg mb-6">📊 预测结果 — 可视化分析</h2>
                {loading ? (
                    <p className="text-slate-500 text-center py-10">加载图表中…</p>
                ) : sortedList.length === 0 ? (
                    <p className="text-slate-400 text-center py-10">暂无数据可展示图表</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-medium mb-3 text-center">📈 建筑面积与预测价格关系</h3>
                            <div className="h-72">
                                {priceBySqftData && (
                                    <Line data={priceBySqftData} options={{
                                        responsive: true, maintainAspectRatio: false,
                                        plugins: { legend: { position: "top" as const } },
                                        scales: {
                                            x: { title: { display: true, text: "建筑面积(平方英尺)" } },
                                            y: { title: { display: true, text: "价格(¥)" } },
                                        },
                                    }} />
                                )}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-medium mb-3 text-center">📊 卧室数量分布</h3>
                            <div className="h-72">
                                {bedroomChartData && (
                                    <Bar data={bedroomChartData} options={{
                                        responsive: true, maintainAspectRatio: false,
                                        plugins: { legend: { position: "top" as const } },
                                        scales: { y: { beginAtZero: true } },
                                    }} />
                                )}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-medium mb-3 text-center">📊 距市区距离与平均预测价格</h3>
                            <div className="h-72">
                                {distanceChartData && (
                                    <Bar data={distanceChartData} options={{
                                        responsive: true, maintainAspectRatio: false,
                                        plugins: { legend: { position: "top" as const } },
                                        scales: { y: { beginAtZero: true } },
                                    }} />
                                )}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-medium mb-3 text-center">🥧 各项因素对价格影响占比</h3>
                            <div className="h-72">
                                {breakdownChartData ? (
                                    <Pie data={breakdownChartData} options={{
                                        responsive: true, maintainAspectRatio: false,
                                        plugins: { legend: { position: "right" as const } },
                                    }} />
                                ) : (
                                    <p className="text-slate-400 text-center pt-20">
                                        请先在下方进行 What-If 分析以显示图表
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* ===== 三、What-If 敏感性分析 ===== */}
            <section className="bg-white p-6 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-lg">🔍 What-If 敏感性分析</h2>
                    <button type="button" onClick={syncBaseToNew}
                            className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-100">
                        🔄 同步基准到新值
                    </button>
                </div>
                <form name="whatIfForm" onSubmit={handleWhatIf} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-sm font-medium text-slate-600 px-1">
                        <div>参数名称</div>
                        <div className="text-center">基准值（必填）</div>
                        <div className="text-center">新值（留空=不变）</div>
                    </div>
                    {[
                        { key: "SquareFootage", label: "建筑面积(平方英尺, 10~10000)", default: DEFAULTS.squareFootage, step: 1, min: 10, max: 10000 },
                        { key: "Bedrooms", label: "卧室数量(1~20)", default: DEFAULTS.bedrooms, step: 1, min: 1, max: 20 },
                        { key: "Bathrooms", label: "卫生间数量(0.5~10)", default: DEFAULTS.bathrooms, step: 0.5, min: 0.5, max: 10 },
                        { key: "YearBuilt", label: "建造年份(1900~至今)", default: DEFAULTS.yearBuilt, step: 1, min: 1900, max: new Date().getFullYear() },
                        { key: "LotSize", label: "地块面积(平方英尺, 50~50000)", default: DEFAULTS.lotSize, step: 1, min: 50, max: 50000 },
                        { key: "DistanceToCityCenter", label: "距市区(km, 0~100)", default: DEFAULTS.distanceToCityCenter, step: 0.1, min: 0, max: 100 },
                        { key: "SchoolRating", label: "学区评分(0~10)", default: DEFAULTS.schoolRating, step: 0.1, min: 0, max: 10 },
                    ].map(field => (
                        <div key={field.key} className="grid grid-cols-3 gap-3 items-center px-1">
                            <span className="text-sm">{field.label}</span>
                            <input
                                name={`base${field.key}`}
                                type="number"
                                step={field.step}
                                min={field.min}
                                max={field.max}
                                defaultValue={field.default}
                                required
                                className="p-2 border rounded text-center text-sm"
                            />
                            <input
                                name={`new${field.key}`}
                                type="number"
                                step={field.step}
                                min={field.min}
                                max={field.max}
                                placeholder="不变"
                                className="p-2 border rounded text-center text-sm focus:ring-2 focus:ring-amber-400"
                            />
                        </div>
                    ))}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
                    >
                        {loading ? "计算中…" : "开始分析"}
                    </button>
                </form>

                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 rounded">❌ {errorMsg}</div>
                )}

                {whatIfResult && (
                    <div className="mt-6 p-5 bg-amber-50 rounded-lg space-y-5">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-sm text-slate-500">基准预测价格</p>
                                <p className="font-bold text-lg">¥{whatIfResult.basePrice?.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">修改后预测价格</p>
                                <p className="font-bold text-lg text-emerald-600">¥{whatIfResult.modifiedPrice?.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">价格变动</p>
                                <p className={`font-bold text-lg ${whatIfResult.difference >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {whatIfResult.difference >= 0 ? "+" : ""}¥{whatIfResult.difference?.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        {whatIfResult.breakdown && Object.keys(whatIfResult.breakdown).length > 0 && (
                            <div className="border-t pt-4">
                                <p className="font-medium mb-3">📋 各项独立影响明细：</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    {Object.entries(whatIfResult.breakdown).map(([name, value]) => {
                                        const num = value as number;
                                        return (
                                            <div key={name} className="flex justify-between items-center p-2.5 bg-white rounded">
                                                <span className="text-slate-700">{name}</span>
                                                <span className={`font-medium ${num >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {num >= 0 ? "+" : ""}¥{num.toLocaleString()}
                        </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}