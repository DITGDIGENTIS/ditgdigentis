/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, useRef } from "react";

export default function ServerStatus() {
  const [isOnline, setIsOnline] = useState(false);
  const lastRef = useRef(false);

  const checkStatus = async () => {
    try {
      const res = await fetch("https://ditgdigentis.vercel.app/api/status", { cache: "no-store" });
      const data = await res.json();
      const online = Date.now() - data["server"]?.timestamp < 20000;

      if (lastRef.current !== online) {
        lastRef.current = online;
        setIsOnline(online);
      }
    } catch (e) {
      setIsOnline(false);
      lastRef.current = false;
    }
  };

  useEffect(() => {
    checkStatus();
    const intv = setInterval(checkStatus, 1000);
    return () => clearInterval(intv);
  }, []);

  return (
    <span className={`indicator ${isOnline ? "connected" : ""}`}></span>
  );
}
