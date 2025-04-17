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
};

const SENSOR_KEYS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const TIMEOUT_MS = 30000;

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
            online: Math.abs(serverTime - raw.timestamp) < TIMEOUT_MS,
          };
        });

        const updatedList = SENSOR_KEYS.map((key) => {
          const cached = sensorCache.current[key];
          const stillOnline =
            cached && Math.abs(Date.now() - cached.timestamp) < TIMEOUT_MS;

          return {
            id: key,
            temp: cached?.temp || "--",
            online: stillOnline,
            timestamp: cached?.timestamp || 0,
          };
        });

        setSensors(updatedList);
      } catch (error) {
        console.error("Ошибка получения:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000); // обновление каждую секунду
    return () => clearInterval(interval);
  }, []);

  const averageTemp = sensors.length
    ? (
        sensors.reduce((acc, s) => acc + parseFloat(s.temp || "0"), 0) /
        sensors.length
      ).toFixed(2)
    : "--";

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mb-1">Средние показания:</h2>
      <div className="row">
        <div className="col-12 col-md-6 pb-2">
          <div className="top-average-temp-block">
            <div className="top-average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span className="top-average-temp-data">
                {averageTemp} °C
              </span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-center mt-4 mb-1">Моніторинг датчиків температури:</h2>
      <div className="row">
        {sensors.map((sensor, index) => (
          <div key={index} className="col-6 col-md-3">
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
