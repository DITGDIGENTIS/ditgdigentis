"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTint,
  faTemperatureHalf,
} from "@fortawesome/free-solid-svg-icons";

type RawHumidityItem = {
  id: string;
  humidity: number;
  temperature: number;
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
  temperature: string;
  online: boolean;
  timestamp: number;
  age: number;
};

const SENSOR_KEYS = ["HUM1-1"];
const TIMEOUT_MS = 5 * 60 * 1000;

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);
  const sensorCache = useRef<Record<string, HumidityData>>({});

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const data: RawHumidityResponse = await res.json();
        const now = Date.now();

        const updated: HumidityData[] = SENSOR_KEYS.map((key) => {
          const raw = data.sensors?.[key];
          const timestamp = raw?.timestamp ?? 0;
          const age = now - timestamp;
          const online = age < TIMEOUT_MS;

          const item: HumidityData = {
            id: key,
            humidity: raw?.humidity?.toFixed(1) ?? "--",
            temperature: raw?.temperature?.toFixed(1) ?? "--",
            timestamp,
            age,
            online,
          };

          sensorCache.current[key] = item;
          return item;
        });

        setSensors(updated);
      } catch (e) {
        console.warn("[HumidityMonitor] Ошибка запроса:", e);
        setSensors(Object.values(sensorCache.current));
      }
    };

    fetchHumidity();
    const interval = setInterval(fetchHumidity, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчиків вологості:</h2>
      <div className="row">
        {sensors.map((sensor, index) => (
          <div key={index} className="col-12 col-md-4 col-lg-3 mb-3">
            {!sensor.online && (
              <div className="alert alert-danger text-center p-2 mb-2">
                ⚠ {sensor.id} не в мережі
              </div>
            )}
            <div className="average-temp-block">
              <div className="description-temp-block">
                {sensor.id}
                <button
                  className={`status-button ${
                    sensor.online ? "online" : "offline"
                  }`}
                  title={`Sensor ${sensor.online ? "Online" : "Offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>

              {/* 👇 ВЛАЖНОСТЬ + ТЕМПЕРАТУРА В ОДНУ ЛИНИЮ */}
              <div className="d-flex justify-content-between gap-3 average-temp-label">
                <span>
                  <FontAwesomeIcon icon={faTint} />{" "}
                  <span className="average-temp-data">{sensor.humidity}%</span>
                </span>
                <span>
                  <FontAwesomeIcon icon={faTemperatureHalf} />{" "}
                  <span className="average-temp-data">
                    {sensor.temperature}°C
                  </span>
                </span>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
