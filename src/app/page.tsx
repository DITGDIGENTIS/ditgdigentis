/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { ZonaStatus } from "../components/ZonaStatus";
import { SensorMonitor } from "../components/SensorMonitor";
import ZonaTemperature from "../components/ZonaTemperature"; 


export default function Home() {
  const [time, setTime] = useState("");
  const [isOnline, setIsOnline] = useState(false);

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

    const checkRemotePiStatus = () => {
      fetch("https://ditgdigentis.vercel.app/api/status", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          const now = Date.now();
          const lastUpdate = data["server"]?.timestamp || 0;
          const online = now - lastUpdate < 20000;
          setIsOnline(online);
        })
        .catch(() => setIsOnline(false));
    };

    checkRemotePiStatus();
    const remotePiInterval = setInterval(checkRemotePiStatus, 1000);

    const updateSensorData = () => {
      const sensorValues: Record<string, string> = {
        sensor1: (20 + Math.random() * 5).toFixed(1) + " °C",
        sensor2: (21 + Math.random() * 5).toFixed(1) + " °C",
        sensor3: (19 + Math.random() * 5).toFixed(1) + " °C",
        sensor4: (22 + Math.random() * 5).toFixed(1) + " °C",
        sensor5: (40 + Math.random() * 10).toFixed(0) + " %",
        sensor6: (42 + Math.random() * 10).toFixed(0) + " %",
        sensor7: (38 + Math.random() * 10).toFixed(0) + " %",
      };

      for (const key in sensorValues) {
        const el = document.getElementById(key);
        if (el) el.textContent = sensorValues[key];
      }

      let sumTemp = 0;
      let countTemp = 0;
      for (let i = 1; i <= 4; i++) {
        const value = parseFloat(sensorValues["sensor" + i]);
        if (!isNaN(value)) {
          sumTemp += value;
          countTemp++;
        }
      }
      const avgTemp = countTemp > 0 ? (sumTemp / countTemp).toFixed(1) : "--";
      const avgTempEl = document.getElementById("averageTemperature");
      if (avgTempEl) avgTempEl.textContent = avgTemp + " °C";

      let sumHum = 0;
      let countHum = 0;
      for (let i = 5; i <= 7; i++) {
        const value = parseFloat(sensorValues["sensor" + i]);
        if (!isNaN(value)) {
          sumHum += value;
          countHum++;
        }
      }
      const avgHum = countHum > 0 ? (sumHum / countHum).toFixed(0) : "--";
      const avgHumEl = document.getElementById("averageHumidity");
      if (avgHumEl) avgHumEl.textContent = avgHum + " %";
    };

    updateSensorData();
    const sensorInterval = setInterval(updateSensorData, 5000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(remotePiInterval);
      clearInterval(sensorInterval);
    };
  }, []);

  return (
    <main>
      <div>
        <div className=" d-flex align-items-center justify-content-center gap-3 ">
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
        </div>
      </div>

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
      <SensorMonitor />

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
    </main>
  );
}
