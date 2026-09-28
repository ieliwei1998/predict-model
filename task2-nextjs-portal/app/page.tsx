import Link from "next/link";

export default function HomePage() {
    return (
        <div className="text-center py-16">
            <h1 className="text-4xl font-bold mb-4">智能房价预测平台</h1>
            <p className="text-lg text-slate-600 mb-8">
                基于机器学习模型 · Python + Java 双后端架构
            </p>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <Link
                    href="/predict"
                    className="p-6 bg-white rounded-xl shadow hover:shadow-md transition"
                >
                    <h2 className="text-xl font-semibold text-blue-600 mb-2">📈 价格预测</h2>
                    <p className="text-slate-500 text-sm">
                        实时估算单套房价
                    </p>
                </Link>

                <Link
                    href="/analysis"
                    className="p-6 bg-white rounded-xl shadow hover:shadow-md transition"
                >
                    <h2 className="text-xl font-semibold text-emerald-600 mb-2">📊 市场分析</h2>
                    <p className="text-slate-500 text-sm">
                        市场筛选 + 情景假设分析
                    </p>
                </Link>
            </div>
        </div>
    );
}