"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ParticlesBackground from "@/components/ParticlesBackground";

export default function Home() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <main className="relative min-h-screen bg-white overflow-hidden flex items-center justify-center px-4">
      <ParticlesBackground />

      <div
        className={`z-10 max-w-3xl w-full bg-white/70 border border-gray-200 shadow-[0_0_40px_rgba(0,100,255,0.15)] backdrop-blur-2xl rounded-3xl px-8 py-12 md:py-16 text-center transition-all duration-1000 transform ${
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-6"
        }`}
      >
        <div className="flex flex-col items-center">
          {/* ЛОГОТИП */}
          <img
            src="/ditg-logo.png"
            alt="DITG Logo"
            width={120}
            height={120}
            className="mb-6 drop-shadow-[0_0_10px_rgba(0,100,255,0.25)]"
          />

          {/* ЗАГОЛОВОК */}
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Система DITG</h1>
          <p className="mt-3 text-gray-600 max-w-md text-base">
            Інтерфейс майбутнього. Все під контролем — завжди.
          </p>

          {/* КНОПКА */}
          <Link href="/link-page" className="mt-8 group relative">
            <div className="px-8 py-4 bg-white border border-blue-300 rounded-xl text-blue-700 font-semibold text-lg shadow-[0_4px_20px_rgba(0,140,255,0.15)] group-hover:shadow-[0_8px_30px_rgba(0,140,255,0.3)] transition duration-500 transform group-hover:scale-105 group-hover:-translate-y-1">
              Переходи в своё пространство →
            </div>
            <div className="absolute inset-0 rounded-xl bg-blue-200 opacity-0 group-hover:opacity-10 transition duration-500 blur-xl"></div>
          </Link>
        </div>
      </div>
    </main>
  );
}
