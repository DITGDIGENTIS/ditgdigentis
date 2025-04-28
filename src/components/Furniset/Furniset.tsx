"use client";

import { FC, useEffect, useState } from "react";
import { LogoutButton } from "../LogoutButton";
import { ServerStatus } from "../ServerStatus";
import { SensorMonitor } from "../SensorMonitor";
import { HumidityMonitor } from "../HumidityMonitor";

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
    const clockInterval = setInterval(updateClock, 1000); // Update time every second

    return () => {
      clearInterval(clockInterval); // Cleanup on component unmount
    };
  }, []);

  return (
    <div>
      <LogoutButton />
      <ServerStatus companyName={"FURNISET"} deviceId="server" />


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
      <SensorMonitor />
      <HumidityMonitor />
    </div>
  );
};
