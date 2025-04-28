"use client";

import { FC, useState, useEffect } from "react";
import { HumidityMonitor } from "../HumidityMonitor";
import { LogoutButton } from "../LogoutButton";
import { SensorMonitor } from "../SensorMonitor";
import { ServerStatus } from "../ServerStatus";
import ZonaAverageBlock from "../ZonaAverageBlock";
import ZonaRelay from "../ZonaRelay";
import { ZonaStatus } from "../ZonaStatus";
import ZonaTemperature from "../ZonaTemperature";

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
