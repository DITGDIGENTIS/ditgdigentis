"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";
import * as _ from "lodash";

type SensorReading = {
  sensor_id: string;
  temperature: number | null;
  timestamp: Date;
};

type SensorData = {
  id: string;
  temp: string;
  status: "ONLINE" | "OFFLINE";
  timestamp: number;
};

export function SensorMonitor() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, SensorData>>({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const companyName = window.location.pathname.split("/")[1];
        const res = await fetch(
          `/api/sensor-readings/last-four/${companyName}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`Failed to fetch sensors: ${res.status}`);

        const readings: SensorReading[] = await res.json();

        const updated: SensorData[] = _.map(readings, (reading) => ({
          id: reading.sensor_id,
          temp:
            reading.temperature !== null
              ? reading.temperature.toFixed(1)
              : "--",
          timestamp: new Date(reading.timestamp).getTime(),
          status: reading.temperature !== null ? "ONLINE" : "OFFLINE",
        }));

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
            <div className="average-temp-block rounded shadow-sm p-3">
              <div className="description-temp-block d-flex justify-content-between mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${sensor.status.toLowerCase()}`}
                >
                  ● {sensor.status}
                </button>
              </div>

              {sensor.status === "OFFLINE" ? (
                <div
                  className="text-center text-danger fw-bold"
                  style={{ fontSize: "1.1rem" }}
                >
                  ⚠ Датчик не в мережі
                </div>
              ) : (
                <div className="average-temp-label text-white d-flex align-items-center gap-2">
                  <FontAwesomeIcon
                    icon={faThermometerHalf}
                    style={{ color: "#FFD700" }}
                  />
                  <span
                    className="average-temp-data fw-bold"
                    style={{ fontSize: "1.6rem" }}
                  >
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
