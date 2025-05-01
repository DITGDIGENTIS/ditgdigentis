"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faTemperatureHalf, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

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
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#111",
    }}>
      <div style={{
        display: "flex",
        gap: "2rem",
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            style={{
              width: "260px",
              borderRadius: "16px",
              padding: "20px",
              backgroundColor: sensor.online ? "#1e1e1e" : "#3b1c1c",
              color: sensor.online ? "white" : "#ff4d4f",
              border: `2px solid ${sensor.online ? "#4caf50" : "#f44336"}`,
              boxShadow: sensor.online ? "0 0 15px #4caf50aa" : "0 0 15px #f4433688",
              transition: "all 0.3s ease",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "16px", fontSize: "1.25rem" }}>{sensor.id}</h3>
            <p style={{ margin: "8px 0", fontSize: "1.1rem" }}>
              <FontAwesomeIcon icon={faTint} /> Влажность:
              <strong> {sensor.humidity}%</strong>
            </p>
            <p style={{ margin: "8px 0", fontSize: "1.1rem" }}>
              <FontAwesomeIcon icon={faTemperatureHalf} /> Температура:
              <strong> {sensor.temperature}°C</strong>
            </p>
            {!sensor.online && (
              <div style={{
                marginTop: "16px",
                backgroundColor: "#ffcccc",
                color: "#a10000",
                padding: "10px",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "0.95rem",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
              }}>
                <FontAwesomeIcon icon={faCircleExclamation} />
                Сенсор {sensor.id} не в мережі
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
