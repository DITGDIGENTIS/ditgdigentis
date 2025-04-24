"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/furniset"); // ⬅️ Куда: сюда
    } else {
      alert("❌ Неверный пароль");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 300 }}>
      <h1>🔐 Вход в Furniset</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Введите пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ display: "block", marginBottom: "1rem", width: "100%" }}
        />
        <button type="submit" style={{ width: "100%" }}>
          Войти
        </button>
      </form>
    </div>
  );
}
