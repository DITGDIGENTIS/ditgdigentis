"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

type SensorReading = {
  sensor_id: string;
  temperature: number;
  timestamp: Date;
};

type Status = "ONLINE" | "TIMED OUT" | "OFFLINE";

type SensorData = {
  id: string;
  temp: string;
  status: Status;
  timestamp: number;
  age: number;
};

const SENSOR_KEYS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const TIMEOUT_MS = 5 * 60 * 1000;
const OFFLINE_MS = 10 * 60 * 1000;

export function SensorMonitor() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, SensorData>>({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const companyName = window.location.pathname.split("/")[1];
        const res = await fetch(`/api/sensor-readings/last-four/${companyName}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

        const readings: SensorReading[] = await res.json();
        const now = Date.now();

        // оновити або додати нові значення
        readings.forEach((reading) => {
          const timestamp = new Date(reading.timestamp).getTime();
          const age = now - timestamp;
          let status: Status = "OFFLINE";
          if (age <= TIMEOUT_MS) status = "ONLINE";
          else if (age <= OFFLINE_MS) status = "TIMED OUT";

          cache.current[reading.sensor_id] = {
            id: reading.sensor_id,
            temp: reading.temperature.toFixed(1),
            timestamp,
            age,
            status,
          };
        });

        // пройтись по всім очікуваним сенсорам
        const updated: SensorData[] = SENSOR_KEYS.map((id) => {
          const item = cache.current[id];
          if (!item) {
            return {
              id,
              temp: "--",
              timestamp: 0,
              age: OFFLINE_MS + 1,
              status: "OFFLINE",
            };
          }
          return {
            ...item,
            temp: item.status === "OFFLINE" ? "--" : item.temp,
          };
        });

        setSensors(updated);
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Sensor fetch error:", err);
        setError(msg);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container sensor-container p-2">
      <h2 className="text-center mt-4 mb-1">Моніторинг SENSOR</h2>

      {error && (
        <div className="alert alert-danger text-center mb-3" role="alert">
          ⚠ Помилка: {error}
        </div>
      )}

      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-6 col-md-3 mb-3">
            {sensor.status !== "ONLINE" && (
              <div
                className={`alert text-center p-2 ${
                  sensor.status === "OFFLINE" ? "alert-danger" : "alert-warning"
                }`}
              >
                ⚠ {sensor.id}{" "}
                {sensor.status === "OFFLINE"
                  ? "не в мережі"
                  : "зник зв'язок"}
              </div>
            )}
            <div className="average-temp-block rounded shadow-sm">
              <div className="description-temp-block d-flex justify-content-between mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${sensor.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  ● {sensor.status}
                </button>
              </div>

              {sensor.status === "OFFLINE" ? (
                <div className="text-center text-danger fw-bold mb-3">
                  Датчик не в мережі
                </div>
              ) : (
                <div className="average-temp-label text-white text-center">
                  <FontAwesomeIcon
                    icon={faThermometerHalf}
                    style={{ color: "#FFD700" }}
                  />{" "}
                  <span className="average-temp-data fw-bold">
                    {sensor.temp} °C
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
