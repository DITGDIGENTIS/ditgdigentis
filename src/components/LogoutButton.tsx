"use client";

import { usePathname } from "next/navigation";
import { findProtectedRouteByPageType } from "@/config/routes";

export function LogoutButton() {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const route = findProtectedRouteByPageType(pathname.split("/")[1]);
      const loginType = route?.authConfig?.loginType;

      console.log("Logout attempt:", { pathname, route, loginType });

      if (!loginType) {
        console.error("Could not determine login type");
        return;
      }

      const res = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginType }),
      });

      console.log("Logout response:", { status: res.status, ok: res.ok });

      if (res.ok) {
        window.location.href = "/";
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "0.5rem 1rem",
        backgroundColor: "#dc3545",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
      }}
    >
      Выйти
    </button>
  );
}
