"use client";

import { findProtectedRouteByPageType } from "@/config/routes";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { FC, useState, useEffect } from "react";
import CanvasParticles from "@/components/CanvasParticles";

export const Login: FC = () => {
  const [password, setPassword] = useState("");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ✅ Один раз оновлює сторінку при вході (очищає кеш рендеру)
  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("login-page-refreshed")) {
      sessionStorage.setItem("login-page-refreshed", "true");
      window.location.reload();
    }
  }, []);

  const getLoginType = () => {
    const redirectPath = searchParams.get("redirect") || pathname;
    const route = findProtectedRouteByPageType(redirectPath.split("/")[1]);
    return route?.authConfig?.loginType || "furniset";
  };

  const handleLogin = async () => {
    try {
      const loginType = getLoginType();

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, loginType }),
      });

      if (res.ok) {
        sessionStorage.removeItem("login-page-refreshed"); // очищає прапор
        const redirectPath = searchParams.get("redirect") || "/";
        router.push(redirectPath);
      } else {
        alert("Невірний пароль");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Сталася помилка при вході");
    }
  };

  return (
    <div className="position-relative min-vh-100 bg-white overflow-hidden">
      {/* 🎇 Частинки фоном */}
      <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 0, pointerEvents: "none" }}>
        <CanvasParticles />
      </div>

      {/* 🌐 Контент поверх */}
      <div className="d-flex justify-content-center align-items-center min-vh-100 px-3 position-relative" style={{ zIndex: 1 }}>
        <div className="bg-white border rounded-4 shadow-sm p-4 p-md-5 w-100" style={{ maxWidth: 360 }}>
          <h2 className="fw-bold text-dark text-center mb-4">🔐 Вхід у систему</h2>
          <input
            type="password"
            className="form-control mb-3"
            placeholder="Введіть пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="btn btn-primary w-100 fw-semibold"
            onClick={handleLogin}
          >
            Увійти
          </button>
        </div>
      </div>
    </div>
  );
};
