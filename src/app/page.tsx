"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div
        className={`w-full max-w-6xl flex flex-col md:flex-row items-center justify-between gap-8 p-6 md:p-12 rounded-[2rem] backdrop-blur-xl bg-white/80 shadow-[inset_0_0_0.5px_rgba(0,0,0,0.1),_0_30px_80px_rgba(0,100,255,0.1)] border border-gray-200 transition-all duration-1000 ease-out transform ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-8 scale-95"
        }`}
      >
        {/* Логотип DITG */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <img
            src="/ditg-logo.png"
            alt="DITG Logo"
            width={160}
            height={160}
            className="mb-4 drop-shadow-[0_0_10px_rgba(0,0,0,0.2)]"
          />
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Система DITG
          </h1>
          <p className="mt-2 text-gray-600 text-sm md:text-base max-w-sm">
            Майбутнє контролю. Прості дії — великі результати.
          </p>
        </div>

        {/* Блок перехода */}
        <div className="group relative">
          <Link href="/link-page" className="block relative">
            <div className="px-8 py-5 bg-white border border-blue-200 rounded-xl text-blue-700 font-semibold text-lg shadow-[0_4px_20px_rgba(0,140,255,0.2)] group-hover:shadow-[0_8px_30px_rgba(0,140,255,0.4)] transition duration-500 transform group-hover:scale-105 group-hover:-translate-y-1">
              Переходи в своё пространство →
            </div>
            <div className="absolute inset-0 rounded-xl bg-blue-200 opacity-0 group-hover:opacity-10 transition duration-500 blur-xl"></div>
          </Link>
        </div>
      </div>
    </main>
  );
}
