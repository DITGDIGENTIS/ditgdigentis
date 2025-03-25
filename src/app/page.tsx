'use client';

import { useEffect, useState } from "react";
import { ZonaStatus } from '../components/ZonaStatus';


export default function Home() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    }

    const interval = setInterval(updateClock, 1000);
    updateClock();

    return () => clearInterval(interval);
  }, []);

  return (
    <main>
      <div className="status-container">
        <div className="indicator-wrapper">
          <span className="indicator-label">DITG DIGENTIS-1</span>
          <span id="indicator" className="indicator"></span>
        </div>
      </div>

      <div className="container mt-4">
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
    </main>
  );
}
