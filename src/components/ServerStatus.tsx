"use client";

import { FC, useEffect, useState, useRef } from "react";
import Image from "next/image";

interface IProps {
  companyName?: string;
  deviceId?: string;
}

export const ServerStatus: FC<IProps> = ({
  companyName,
  deviceId = "server",
}) => {
  const [isOnline, setIsOnline] = useState(false);
  const lastRef = useRef<boolean>(false);

  const checkStatus = async () => {
    try {
      const res = await fetch("https://ditgdigentis.vercel.app/api/status", {
        next: { revalidate: 0 },
      });
      const data = await res.json();

      console.log(data, "=== SERVER STATUS ===");

      const lastUpdate = data?.[deviceId]?.timestamp ?? 0;
      const online = Date.now() - lastUpdate * 1000 < 20000;

      if (lastRef.current !== online) {
        lastRef.current = online;
        setIsOnline(online);
      }
    } catch (err: unknown) {
      console.error("Error fetching server status:", err);
      lastRef.current = false;
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const intv = setInterval(checkStatus, 2000); // или 5000 для продакшна
    return () => clearInterval(intv);
  }, [deviceId]);

  return (
    <>
      <div className="d-flex align-items-center justify-content-center mt-3 gap-3">
        <Image
          src="/ditg-logo.png"
          alt="DITG Logo"
          width={150}
          height={150}
          className="ditg-logo"
          priority
        />
        <span className="indicator-label fw-bold fs-5 text-light">
          {companyName}
        </span>
        <span
          className={`status-indicator ${isOnline ? "online" : "offline"}`}
          title={isOnline ? "Online" : "Offline"}
        >
          {isOnline ? "● ONLINE" : "○ OFFLINE"}
        </span>
      </div>

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
          animation: pulseRed 1s infinite;
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
            box-shadow: 0 0 0 15px rgba(220, 53, 69, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
          }
        }
      `}</style>
    </>
  );
};
