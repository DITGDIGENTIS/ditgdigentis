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
    <div className="relative w-100 overflow-x-hidden" style={{ minHeight: "100vh" }}>
       {/* 🎇 Частицы: фиксированная зона 400px */}
       <div style={{
          position: "fixed",
          inset: 0, // растягивает по всему экрану
          zIndex: -1,
          pointerEvents: "none",
          backgroundColor: "white",
        }}>
          <CanvasParticles />
        </div>



      {/* 🌐 Контент поверх (со смещением от 400px вверх) */}
      <main style={{ position: "relative", zIndex: 10, paddingTop: "140px", paddingBottom: "120px", paddingLeft: "1rem", paddingRight: "1rem" }}>
        <div
          className={`max-w-3xl mx-auto backdrop-blur-2xl rounded-3xl shadow-[0_0_60px_rgba(0,140,255,0.2)] bg-white/80 px-8 py-12 md:py-16 text-center transition-all duration-1000 ease-out transform ${
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-6"
          }`}
        >
          <div className="flex flex-col align-items-center">
            <img
              src="/ditg-logo.png"
              alt="DITG Logo"
              width={140}
              height={140}
              className="mb-4"
            />

            <h1 className="fs-2 fw-bold text-dark">Система DITG</h1>
            <p className="mt-3 text-secondary fs-6">Інтерфейс майбутнього. Все під контролем — завжди.</p>

            <Link href="/link-page" className="mt-4 d-inline-block position-relative group">
              <div className="px-4 py-3 border border-primary rounded text-primary fw-semibold fs-5 shadow"
                style={{ transition: "all 0.5s", backgroundColor: "white" }}>
                Переходи в своё пространство →
              </div>
            </Link>
          </div>
        </div>

        {/* ⬇ Скроллируемый контент */}
        <div className="max-w-3xl mx-auto mt-5 text-secondary fs-6">
          
        </div>
      </main>
    </div>
  );
}
