"use client";

import { FC, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ServerStatus } from "../ServerStatus";

// Динамический импорт компонентов, использующих браузерные API
const SensorMonitor = dynamic(() => import("../SensorMonitor").then(mod => mod.SensorMonitor), { ssr: false });
const HumidityMonitor = dynamic(() => import("../HumidityMonitor").then(mod => mod.HumidityMonitor), { ssr: false });
const SensorGraph = dynamic(() => import("../SensorGraph"), { ssr: false });

export const Furniset: FC = () => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      const s = now.getSeconds().toString().padStart(2, "0");
      setTime(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "0rem" }}>
      <ServerStatus companyName="FURNISET" deviceId="server" />
      <div className="container py-3 text-center">
        <span id="clock" className="fw-semibold" style={{ fontSize: "2.6rem" }}>{time}</span>
      </div>
      <HumidityMonitor />
      <SensorMonitor />
      <div className="container mt-4">
        <h4 className="text-center mb-3" style={{ fontSize: "1.4rem", color: "#fff", fontWeight: "bold" }}>Графік (HUM1-1)</h4>
        <SensorGraph sensorId="HUM1-1" />
      </div>
    </div>
  );
};
