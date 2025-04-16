/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";

export default function ServerStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const lastServerOnlineRef = useRef<boolean>(false);

  const checkServerStatus = async () => {
    try {
      // Request the server status
      const res = await fetch("https://ditgdigentis.vercel.app/api/status/serverstatus", {
        cache: "no-store", // Чтобы всегда получать актуальные данные
      });
      const data = await res.json();
      const now = Date.now();

      // Getting the last timestamp from the server
      const lastUpdate = data["server"]?.timestamp || 0;

      // Consider the server online if the last update is within the last 20 seconds
      const online = now - lastUpdate < 20000;

      // Update state only if it has changed
      if (lastServerOnlineRef.current !== online) {
        lastServerOnlineRef.current = online;
        setIsOnline(online);
      }
    } catch (error) {
      console.error("Error checking server status:", error);
      setIsOnline(false);
      lastServerOnlineRef.current = false;
    }
  };

  // UseEffect hook to check server status when the component mounts
  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000); // Periodically update every 10 seconds
    return () => {
      clearInterval(interval); // Cleanup interval when component is unmounted
    };
  }, []); // Empty dependency array means this effect runs once on component mount

  return (
    <div className="d-flex align-items-center justify-content-center gap-3">
      <img
        src="/ditg-logo.png"
        alt="DITG Logo"
        width={160}
        height={160}
        className="ditg-logo"
      />
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
    </div>
  );
}
