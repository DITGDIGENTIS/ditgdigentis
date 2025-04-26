// src/app/login/page.tsx
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        redirect: "follow"
      });

      if (res.redirected) {
        window.location.href = res.url;
      } else if (!res.ok) {
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
}
