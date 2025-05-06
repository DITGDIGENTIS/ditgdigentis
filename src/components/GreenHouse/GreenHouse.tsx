"use client";

import { FC, useState, useEffect } from "react";
import dynamic from "next/dynamic";

const HumidityMonitor = dynamic(
  () => import("../HumidityMonitor").then((mod) => mod.HumidityMonitor),
  { ssr: false }
);
const LogoutButton = dynamic(
  () => import("../LogoutButton").then((mod) => mod.LogoutButton),
  { ssr: false }
);
const SensorMonitor = dynamic(
  () => import("../SensorMonitor").then((mod) => mod.SensorMonitor),
  { ssr: false }
);
const ServerStatus = dynamic(
  () => import("../ServerStatus").then((mod) => mod.ServerStatus),
  { ssr: false }
);
const ZonaAverageBlock = dynamic(() => import("../ZonaAverageBlock"), {
  ssr: false,
});
const ZonaRelay = dynamic(() => import("../ZonaRelay"), { ssr: false });
const ZonaStatus = dynamic(
  () => import("../ZonaStatus").then((mod) => mod.ZonaStatus),
  { ssr: false }
);
const ZonaTemperature = dynamic(() => import("../ZonaTemperature"), {
  ssr: false,
});

export const GreenHouse: FC = () => {
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
    const clockInterval = setInterval(updateClock, 1000); // Update time every second

    return () => {
      clearInterval(clockInterval); // Cleanup on component unmount
    };
  }, []);

  return (
    <div>
      <LogoutButton />
      <ServerStatus companyName={"Green House"} />

      {/* Time display */}
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

      <ZonaStatus />
      <ZonaTemperature />
      <ZonaAverageBlock />
      <SensorMonitor />
      <HumidityMonitor />
      <ZonaRelay />
    </div>
  );
};
