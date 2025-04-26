"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    // Удаляем токен из localStorage
    localStorage.removeItem('auth_token');
    // Перенаправляем на страницу логина
    router.push('/login');
  };

  return (
    <button 
      onClick={handleLogout}
      className="btn btn-danger"
    >
      Выйти
    </button>
  );
} 