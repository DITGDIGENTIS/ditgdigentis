"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

type RawSensorItem = {
  id: string;
  temperature: number | string;
  timestamp: number;
};

type RawSensorResponse = {
  sensors: {
    [sensorKey: string]: RawSensorItem;
  };
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
  const sensorCache = useRef<Record<string, SensorData>>({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/sensors", { cache: "no-store" });
        const response: RawSensorResponse = await res.json();
        const data = response.sensors;
        const serverTime = response.serverTime;

        SENSOR_KEYS.forEach((key) => {
          const raw = data[key];
          if (!raw) return;

          sensorCache.current[key] = {
            id: key,
            temp: raw.temperature?.toString() || "--",
            timestamp: raw.timestamp,
            age: serverTime - raw.timestamp,
            online: true,
          };
        });

        const updatedList = SENSOR_KEYS
          .map((key) => {
            const cached = sensorCache.current[key];
            const isOffline =
              !cached?.timestamp || serverTime - cached.timestamp > TIMEOUT_MS;

            return {
              id: key,
              temp: !isOffline ? cached?.temp || "--" : "--",
              online: !isOffline,
              timestamp: cached?.timestamp || 0,
              age: cached?.timestamp ? serverTime - cached.timestamp : 0,
            };
          })
          .sort((a, b) => {
            const aNum = parseInt(a.id.split("-")[1]);
            const bNum = parseInt(b.id.split("-")[1]);
            return aNum - bNum;
          });

        setSensors(updatedList);
      } catch (error) {
        console.error("Ошибка получения:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчиків температури:</h2>
      <div className="row">
        {sensors.map((sensor, index) => (
          <div key={index} className="col-6 col-md-3">
            {!sensor.online && (
              <div className="alert alert-danger text-center p-2 mb-2">
                ⚠ {sensor.id} не в мережі
              </div>
            )}
            <div className="average-temp-block">
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
                <FontAwesomeIcon icon={faThermometerHalf} />{" "}
                <span className="average-temp-data">{sensor.temp} °C</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
