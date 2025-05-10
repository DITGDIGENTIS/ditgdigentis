"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";
import { SensorDataBatch } from "../services/sensor-data.service";

type RawSensorItem = {
  id: string;
  temperature: number | string;
  timestamp: number;
};

type RawSensorResponse = {
  sensors: Record<string, RawSensorItem>;
  serverTime: number;
};

type SensorData = {
  id: string;
  temp: string;
  online: boolean;
  timestamp: number;
  age: number;
};

const SENSOR_KEYS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const TIMEOUT_MS = 5 * 60 * 1000;

export function SensorMonitor() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const cache = useRef<Record<string, SensorData>>({});

  const saveToDatabase = async (sensorData: Record<string, RawSensorItem>) => {
    try {
      const sensorBatch: SensorDataBatch = {
        sensors: _.map(sensorData, (sensor, id) => ({
          sensor_id: id,
          temperature: Number(sensor.temperature),
          humidity: 0, // Поскольку у нас нет данных о влажности, устанавливаем 0
          timestamp: new Date(sensor.timestamp)
        }))
      };

      const response = await fetch("/api/sensor-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sensorBatch),
      });

      if (!response.ok) {
        throw new Error("Failed to save sensor data to database");
      }

      console.log("Successfully saved sensor data to database");
    } catch (error) {
      console.error("Error saving sensor data:", error);
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/sensors", { cache: "no-store" });
        const { sensors: data, serverTime }: RawSensorResponse = await res.json();

        // Сохраняем данные в базу
        await saveToDatabase(data);

        SENSOR_KEYS.forEach((key) => {
          const raw = data[key];
          if (!raw) return;
          const age = serverTime - raw.timestamp;

          cache.current[key] = {
            id: key,
            temp: Number(raw.temperature).toFixed(1),
            timestamp: raw.timestamp,
            age,
            online: age <= TIMEOUT_MS,
          };
        });

        const updated = SENSOR_KEYS.map((key) => {
          const s = cache.current[key] || {
            id: key,
            temp: "--",
            timestamp: 0,
            age: Infinity,
            online: false,
          };

          const isOffline = !s.timestamp || s.age > TIMEOUT_MS;

          const result: SensorData = {
            ...s,
            temp: isOffline ? "--" : s.temp,
            online: !isOffline,
            age: serverTime - s.timestamp,
          };

          return result;
        });

        setSensors(updated);
      } catch (err) {
        console.error("Error fetching sensor status:", err);
      }
    };

    fetchStatus();
    const int = setInterval(fetchStatus, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="container sensor-container p-2">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчиків температури:</h2>
      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-6 col-md-3">
            {!sensor.online && (
              <div className="alert alert-danger text-center p-2 mb-2">
                ⚠ {sensor.id} не в мережі
              </div>
            )}
            <div className="average-temp-block rounded shadow-sm">
              <div className="description-temp-block d-flex justify-content-between mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${sensor.online ? "online" : "offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label text-white">
                <FontAwesomeIcon icon={faThermometerHalf} style={{ color: "#FFD700" }} />{" "}
                <span className="average-temp-data fw-bold">{sensor.temp} °C</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
