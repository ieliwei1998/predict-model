"use client";
import { ReactNode, useState } from "react";
import Link from "next/link";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
    const [globalError, setGlobalError] = useState<string | null>(null);

    return (
        <html lang="zh-CN">
        <body>
        {/* 导航栏 */}
        <header className="bg-white shadow-sm border-b px-4 py-3">
            <nav className="max-w-6xl mx-auto flex gap-6 items-center">
                <Link href="/" className="font-bold text-xl text-blue-600">
                    🏠 智能房价平台
                </Link>
                <Link href="/predict" className="hover:text-blue-600 font-medium">
                    价格预测
                </Link>
                <Link href="/analysis" className="hover:text-emerald-600 font-medium">
                    市场分析
                </Link>
            </nav>
        </header>

        {/* 主内容区 */}
        <main className="max-w-6xl mx-auto px-4 py-8">
            {globalError ? (
                <div className="text-center py-16">
                    <h2 className="text-xl font-bold text-red-600 mb-2">系统异常</h2>
                    <p className="text-slate-500 mb-4">{globalError}</p>
                    <button
                        onClick={() => location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        刷新页面
                    </button>
                </div>
            ) : (
                children
            )}
        </main>
        </body>
        </html>
    );
}