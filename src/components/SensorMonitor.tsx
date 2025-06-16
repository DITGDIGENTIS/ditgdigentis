"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";
import * as _ from "lodash";

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

const TIMEOUT_MS = 5 * 60 * 1000;
const OFFLINE_MS = 10 * 60 * 1000;

export function SensorMonitor() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const SENSOR_KEYS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/sensor-readings/last-four", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch sensors: ${res.status}`);
        
        const readings: SensorReading[] = await res.json();
        const now = Date.now();

        const readingsMap: Record<string, SensorReading> = {};
        readings.forEach((r) => readingsMap[r.sensor_id] = r);

        const updated: SensorData[] = SENSOR_KEYS.map((key) => {
          const reading = readingsMap[key];

          if (reading) {
            const timestamp = new Date(reading.timestamp).getTime();
            const age = now - timestamp;

            let status: Status = "OFFLINE";
            if (age <= TIMEOUT_MS) status = "ONLINE";
            else if (age <= OFFLINE_MS) status = "TIMED OUT";

            return {
              id: key,
              temp: status === "OFFLINE" ? "--" : reading.temperature.toFixed(1),
              timestamp,
              age,
              status,
            };
          } else {
            return {
              id: key,
              temp: "--",
              timestamp: 0,
              age: Infinity,
              status: "OFFLINE",
            };
          }
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
      <h2 className="text-center mt-4 mb-1">
        Моніторинг датчиків температури:
      </h2>

      {error && (
        <div className="alert alert-danger text-center mb-3" role="alert">
          ⚠ Помилка: {error}
        </div>
      )}

      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-6 col-md-3">
            {sensor.status !== "ONLINE" && (
              <div
                className={`alert text-center p-2 mb-2 ${
                  sensor.status === "OFFLINE" ? "alert-danger" : "alert-warning"
                }`}
              >
                ⚠ {sensor.id}{" "}
                {sensor.status === "OFFLINE" ? "не в мережі" : "зник зв'язок"}
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
              <div className="average-temp-label text-white">
                <FontAwesomeIcon
                  icon={faThermometerHalf}
                  style={{ color: "#FFD700" }}
                />{" "}
                <span className="average-temp-data fw-bold">
                  {sensor.temp} °C
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
