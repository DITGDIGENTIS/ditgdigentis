// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/furniset");
    } else {
      alert("Неверный пароль");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 320 }}>
      <h1>🔐 Вход в Furniset</h1>
      <input
        type="password"
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
