/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef } from "react";
import { ZonaStatus } from "../components/ZonaStatus";
import { SensorMonitor } from "../components/SensorMonitor";
import ZonaTemperature from "../components/ZonaTemperature";
import ZonaRelay from "../components/ZonaRelay";

export default function Home() {
  const [time, setTime] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  // Храним предыдущее значение статуса сервера, чтобы не обновлять его лишний раз
  const lastServerOnlineRef = useRef<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    const checkRemotePiStatus = async () => {
      try {
        const res = await fetch("https://ditgdigentis.vercel.app/api/status", {
          cache: "no-store",
        });
        const data = await res.json();
        const now = Date.now();
        // Здесь предполагается, что серверный статус хранится в data.server.timestamp
        const lastUpdate = data["server"]?.timestamp || 0;
        const online = now - lastUpdate < 20000;
        // Обновляем состояние только если результат изменился
        if (lastServerOnlineRef.current !== online) {
          lastServerOnlineRef.current = online;
          setIsOnline(online);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Error checking server status:", err.message);
        } else {
          console.error("Error checking server status:", err);
        }
        lastServerOnlineRef.current = false;
        setIsOnline(false);
      }
    };

    checkRemotePiStatus();
    const remotePiInterval = setInterval(checkRemotePiStatus, 10000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(remotePiInterval);
    };
  }, []);

  return (
    <main>
      {/* Статус сервера */}
      <div className="d-flex align-items-center justify-content-center gap-3">
        <img
          src="/ditg-logo.png"
          alt="DITG Logo"
          width={160}
          height={160}
          className="ditg-logo"
        />
        <span className="indicator-label fw-bold fs-5 text-light">
          ID:0001
        </span>
        <span
          className={`status-indicator ${isOnline ? "online" : "offline"}`}
          title={isOnline ? "Online" : "Offline"}
        >
          {isOnline ? "● ONLINE" : "○ OFFLINE"}
        </span>
      </div>

      {/* Время */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-auto text-center">
            <span
              id="clock"
              className="fw-semibold"
              style={{ fontSize: "2.6rem" }}
            >
              {time}
            </span>
          </div>
        </div>
      </div>

      {/* Статус зоны */}
      <ZonaStatus />

      {/* Другие компоненты */}
      <ZonaTemperature />
      <SensorMonitor />
      <ZonaRelay />

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
          0% {
            box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(40, 167, 69, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
          }
        }

        @keyframes pulseRed {
          0% {
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(220, 53, 69, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
          }
        }
      `}</style>
    </main>
  );
}
