"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faTemperatureLow } from "@fortawesome/free-solid-svg-icons";

type RawHumidityItem = {
  id: string;
  humidity: number | string;
  temperature?: number | string;
  timestamp: number | string;
};

type RawHumidityResponse = {
  sensors: {
    [sensorKey: string]: RawHumidityItem;
  };
  serverTime: number | string;
};

type HumidityData = {
  id: string;
  humidity: string;
  temperature: string;
  online: boolean;
  timestamp: number;
  age: number;
};

const SENSOR_KEYS = ["HUM1-1"];
const TIMEOUT_MS = 2 * 60 * 1000;

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);
  const sensorCache = useRef<Record<string, HumidityData>>({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const response: RawHumidityResponse = await res.json();
        const data = response.sensors || {};
        const serverTime = Number(response.serverTime) || Date.now();

        SENSOR_KEYS.forEach((key) => {
          const raw = data[key];
          const ts = raw ? Number(raw.timestamp) : 0;
          const humidity = raw ? parseFloat(String(raw.humidity)) : NaN;
          const temperature = raw ? parseFloat(String(raw.temperature)) : NaN;

          // Створюємо порожній слот, якщо його немає
          if (!sensorCache.current[key]) {
            sensorCache.current[key] = {
              id: key,
              humidity: "--",
              temperature: "--",
              timestamp: 0,
              age: Infinity,
              online: false,
            };
          }

          if (raw && !isNaN(humidity) && !isNaN(temperature)) {
            sensorCache.current[key] = {
              id: key,
              humidity: humidity.toFixed(0),
              temperature: temperature.toFixed(1),
              timestamp: ts,
              age: serverTime - ts,
              online: true,
            };
          }
        });

        const updatedList = SENSOR_KEYS.map((key) => {
          const cached = sensorCache.current[key];
          const isOffline =
            !cached?.timestamp || serverTime - cached.timestamp > TIMEOUT_MS;

          return {
            id: key,
            humidity: !isOffline ? cached?.humidity || "--" : "--",
            temperature: !isOffline ? cached?.temperature || "--" : "--",
            timestamp: cached?.timestamp || 0,
            age: cached?.timestamp ? serverTime - cached.timestamp : 0,
            online: !isOffline,
          };
        });

        setSensors(updatedList);
      } catch (e) {
        console.error("Помилка завантаження:", e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчика вологості:</h2>
      <div className="row">
        {sensors.map((sensor, index) => (
          <div key={index} className="col-12 col-md-3">
            {!sensor.online && (
              <div className="alert alert-danger text-center p-2 mb-2">
                ⚠ {sensor.id} не в мережі
              </div>
            )}
            <div className="average-temp-block p-3 rounded shadow-sm">
              <div className="description-temp-block d-flex justify-content-between mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${sensor.online ? "online" : "offline"}`}
                  title={`Sensor ${sensor.online ? "Online" : "Offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label d-flex justify-content-between gap-3 text-white">
                <div>
                  <FontAwesomeIcon icon={faTint} style={{ color: "#FFD700" }} />{" "}
                  <span className="average-temp-data fw-bold">{sensor.humidity} %</span>
                </div>
                <div>
                  <FontAwesomeIcon icon={faTemperatureLow} style={{ color: "#FFD700" }} />{" "}
                  <span className="average-temp-data fw-bold">{sensor.temperature} °C</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
