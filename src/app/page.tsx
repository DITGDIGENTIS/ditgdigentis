'use client';

import { useEffect, useState } from "react";
import { ZonaStatus } from '../components/ZonaStatus';
import { SensorMonitor } from '../components/SensorMonitor';

export default function Home() {
  const [time, setTime] = useState("");

  useEffect(() => {
    // ⏰ Обновление часов
    function updateClock() {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    }

    const clockInterval = setInterval(updateClock, 1000);
    updateClock();

    // 🔌 Проверка подключения удалённой платы через Vercel API
    function checkRemotePiStatus() {
      fetch("https://ditgdigentis.vercel.app/api/status")
        .then((res) => res.json())
        .then((data) => {
          const now = Date.now();
          const lastUpdate = data.timestamp || 0;
          const online = now - lastUpdate < 2 * 60 * 1000; // онлайн, если обновлено <2 мин назад
          const el = document.getElementById("indicator");
          if (el) {
            if (online) {
              el.classList.add("connected");
            } else {
              el.classList.remove("connected");
            }
          }
        })
        .catch(() => {
          const el = document.getElementById("indicator");
          if (el) el.classList.remove("connected");
        });
    }

    const remotePiInterval = setInterval(checkRemotePiStatus, 10000);
    checkRemotePiStatus();

    // 📊 Обновление данных сенсоров (твоё)
    function updateSensorData() {
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
        if (el) {
          el.textContent = sensorValues[key];
        }
      }

      // Средняя температура
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

      // Средняя влажность
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
    }

    const sensorInterval = setInterval(updateSensorData, 5000);
    updateSensorData();

    return () => {
      clearInterval(clockInterval);
      clearInterval(remotePiInterval);
      clearInterval(sensorInterval);
    };
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
      <SensorMonitor />
    </main>
  );
}
