"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faTemperatureHalf } from "@fortawesome/free-solid-svg-icons";

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
        // fallback на кэш
        setSensors(Object.values(sensorCache.current));
      }
    };

    fetchHumidity();
    const interval = setInterval(fetchHumidity, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="humidity-monitor">
      {sensors.map((sensor) => (
        <div key={sensor.id} className={`sensor-block ${sensor.online ? "online" : "offline"}`}>
          <h5>{sensor.id}</h5>
          <p>
            <FontAwesomeIcon icon={faTint} /> Влажность: {sensor.humidity}%
          </p>
          <p>
            <FontAwesomeIcon icon={faTemperatureHalf} /> Температура: {sensor.temperature}°C
          </p>
          {!sensor.online && (
            <div className="alert">
              ⚠️ Сенсор {sensor.id} не в мережі
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
