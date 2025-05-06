"use client";

import { FC, useEffect, useState } from "react";
import { ServerStatus } from "../ServerStatus";
import { SensorMonitor } from "../SensorMonitor";
import { HumidityMonitor } from "../HumidityMonitor";
import SensorGraph from "../SensorGraph"; // 👈 добавили

export const Furniset: FC = () => {
  const [time, setTime] = useState("");

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
    return () => clearInterval(clockInterval);
  }, []);

  return (
    <div>
      <ServerStatus companyName={"FURNISET"} deviceId="server" />

      {/* Clock */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-auto text-center">
            <span id="clock" className="fw-semibold" style={{ fontSize: "2.6rem" }}>
              {time}
            </span>
          </div>
        </div>
      </div>

      {/* Realtime monitors */}
      <HumidityMonitor />
      <SensorMonitor />

      {/* 📊 Исторический график (например, по HUM1-1) */}
      <div className="container mt-4">
        <h4 className="text-center mb-3">Графік за добу (HUM1-1)</h4>
        <SensorGraph  />
      </div>
    </div>
  );
};
