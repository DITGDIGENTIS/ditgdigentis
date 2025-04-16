/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";

export default function ServerStatus() {
  const [isOnline, setIsOnline] = useState(false);
  const lastServerOnlineRef = useRef(false);

  const checkServerStatus = async () => {
    try {
      const res = await fetch("https://ditgdigentis.vercel.app/api/status/serverstatus", {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Сервер не отвечает");

      const data = await res.json();
      const now = Date.now();
      const lastUpdate = data.timestamp || 0;
      const online = now - lastUpdate < 20000;

      if (lastServerOnlineRef.current !== online) {
        lastServerOnlineRef.current = online;
        setIsOnline(online);
      }
    } catch (error) {
      console.error("Ошибка при проверке статуса сервера:", error);
      lastServerOnlineRef.current = false;
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="d-flex align-items-center justify-content-center gap-3">
      <img src="/ditg-logo.png" alt="DITG Logo" width={160} height={160} className="ditg-logo" />
      <span className="indicator-label fw-bold fs-5 text-light">ID:0001</span>
      <span
        className={`status-indicator ${isOnline ? "online" : "offline"}`}
        title={isOnline ? "Online" : "Offline"}
      >
        {isOnline ? "● ONLINE" : "○ OFFLINE"}
      </span>

      <style jsx>{`
        .ditg-logo {
          border-radius: 0;
          object-fit: contain;
          padding: 20px;
        }
        .status-indicator {
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        }
        .online {
          background-color: #28a745;
          animation: pulseGreen 2s infinite;
        }
        .offline {
          background-color: #dc3545;
          animation: pulseRed 2s infinite;
        }
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(40, 167, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
        }
        @keyframes pulseRed {
          0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
      `}</style>
    </div>
  );
}
