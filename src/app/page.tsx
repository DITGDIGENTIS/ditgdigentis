"use client";

import { useEffect, useState } from "react";
import ServerStatus from "../components/ServerStatus";  // Importing the ServerStatus component
import { ZonaStatus } from "../components/ZonaStatus";
import { SensorMonitor } from "../components/SensorMonitor";
import ZonaTemperature from "../components/ZonaTemperature";
import ZonaRelay from "../components/ZonaRelay";

export default function Home() {
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
    <main>
      <ServerStatus /> {/* Including the ServerStatus component here */}
      
      {/* Time display */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-auto text-center">
            <span id="clock" className="fw-semibold" style={{ fontSize: "2.6rem" }}>
              {time}
            </span>
          </div>
        </div>
      </div>

      <ZonaStatus />
      <ZonaTemperature />
      <SensorMonitor />
      <ZonaRelay />

      <style jsx>{`
        /* Additional custom styling can go here */
      `}</style>
    </main>
  );
}
