"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint } from "@fortawesome/free-solid-svg-icons";

type RawHumidityItem = {
  id: string;
  humidity: number | string;
  timestamp: number;
};

type RawHumidityResponse = {
  sensors: {
    [sensorKey: string]: RawHumidityItem;
  };
  serverTime: number;
};

type HumidityData = {
  id: string;
  humidity: string;
  online: boolean;
  timestamp: number;
  age: number;
};

const TIMEOUT_MS = 5 * 60 * 1000; // 5 минут

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);
  const sensorCache = useRef<Record<string, HumidityData>>({});

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const response: RawHumidityResponse = await res.json();
        const data = response.sensors || {};
        const serverTime = response.serverTime;

        // Сохраняем сырые данные с обновлённым timestamp
        Object.entries(data).forEach(([key, raw]) => {
          if (!raw || !raw.timestamp) return;

          const humidityStr = raw.humidity?.toString() || "--";

          sensorCache.current[key] = {
            id: key,
            humidity: humidityStr,
            timestamp: raw.timestamp,
            age: 0, // пересчитается ниже
            online: true, // пересчитается ниже
          };
        });

        // Формируем список с актуальными age/online
        let updatedList = Object.keys(sensorCache.current).map((key) => {
          const cached = sensorCache.current[key];
          const age = serverTime - cached.timestamp;
          const isOffline = age > TIMEOUT_MS;

          return {
            ...cached,
            age,
            humidity: isOffline ? "--" : cached.humidity,
            online: !isOffline && cached.humidity !== "--",
          };
        });

        if (updatedList.length === 0) {
          updatedList = [
            {
              id: "HUM1-1",
              humidity: "--",
              online: false,
              timestamp: 0,
              age: 0,
            },
          ];
        }

        updatedList.sort((a, b) => a.id.localeCompare(b.id));
        setSensors(updatedList);
      } catch (error) {
        console.error("Ошибка получения влажности:", error);
      }
    };

    fetchHumidity();
    const interval = setInterval(fetchHumidity, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчика вологості:</h2>
      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-12 col-md-12">
            <div className={`average-temp-block ${sensor.online ? "online" : "offline"}`}>
              {!sensor.online && (
                <div className="alert alert-danger text-center p-2 mb-2">
                  ⚠ {sensor.id} не в мережі
                </div>
              )}
              <div className="description-temp-block">
                {sensor.id}
                <button
                  className={`status-button ${sensor.online ? "online" : "offline"}`}
                  title={`Sensor ${sensor.online ? "Online" : "Offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label">
                <FontAwesomeIcon icon={faTint} />{" "}
                <span className="average-temp-data">{sensor.humidity} %</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
