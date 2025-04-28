"use client";

import { findProtectedRouteByPageType } from "@/config/routes";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { FC, useState } from "react";

export const Login: FC = () => {
  const [password, setPassword] = useState("");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

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
        body: JSON.stringify({
          password,
          loginType,
        }),
      });

      if (res.ok) {
        const redirectPath = searchParams.get("redirect") || "/";
        router.push(redirectPath);
      } else {
        alert("Неверный пароль");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Произошла ошибка при входе");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 320 }}>
      <h1>🔐 Вход в Furniset</h1>
      <input
        type="text"
        placeholder="Введите пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      <button onClick={handleLogin} style={{ width: "100%" }}>
        Войти
      </button>
    </div>
  );
};
