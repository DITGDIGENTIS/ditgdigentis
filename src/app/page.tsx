"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CanvasParticles from "@/components/CanvasParticles";

export default function Home() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* 🎇 Фоновые частицы */}
      <CanvasParticles />

      {/* 🌐 Основной контент поверх */}
      <main className="relative z-10 px-4 py-20">
        <div
          className={`max-w-3xl mx-auto bg-white/80 border border-gray-200 backdrop-blur-2xl rounded-3xl shadow-[0_0_60px_rgba(0,140,255,0.2)] px-8 py-12 md:py-16 text-center transition-all duration-1000 ease-out transform ${
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-6"
          }`}
        >
          <div className="flex flex-col items-center">
            <img
              src="/ditg-logo.png"
              alt="DITG Logo"
              width={120}
              height={120}
              className="mb-6 drop-shadow-[0_0_15px_rgba(0,140,255,0.35)]"
            />

            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              Система DITG
            </h1>
            <p className="mt-3 text-gray-600 max-w-md text-base">
              Інтерфейс майбутнього. Все під контролем — завжди.
            </p>

            <Link href="/link-page" className="mt-8 group relative">
              <div className="px-8 py-4 bg-white border border-blue-300 rounded-xl text-blue-700 font-semibold text-lg shadow-[0_4px_24px_rgba(0,140,255,0.2)] group-hover:shadow-[0_8px_40px_rgba(0,140,255,0.35)] transition duration-500 transform group-hover:scale-105 group-hover:-translate-y-1">
                Переходи в своё пространство →
              </div>
              <div className="absolute inset-0 rounded-xl bg-blue-200 opacity-0 group-hover:opacity-10 transition duration-500 blur-xl"></div>
            </Link>
          </div>
        </div>

        {/* ⬇ Дополнительный контент, чтобы включить скроллинг */}
        <div className="max-w-3xl mx-auto mt-20 space-y-6 text-gray-700">
          {[...Array(30)].map((_, i) => (
            <p key={i}>📌 Блок контента #{i + 1}: демонстрация скролла поверх частиц.</p>
          ))}
        </div>
      </main>
    </div>
  );
}
