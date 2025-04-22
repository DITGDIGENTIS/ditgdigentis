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

const HUMIDITY_KEYS = ["HUM1-1", "HUM1-2", "HUM1-3", "HUM1-4"];
const TIMEOUT_MS = 5 * 60 * 1000;

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);
  const sensorCache = useRef<Record<string, HumidityData>>({});

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const response: RawHumidityResponse = await res.json();
        const data = response.sensors;
        const serverTime = response.serverTime;

        HUMIDITY_KEYS.forEach((key) => {
          const raw = data[key];
          if (!raw) return;

          sensorCache.current[key] = {
            id: key,
            humidity: raw.humidity?.toString() || "--",
            timestamp: raw.timestamp,
            age: serverTime - raw.timestamp,
            online: true,
          };
        });

        const updatedList = HUMIDITY_KEYS.map((key) => {
          const cached = sensorCache.current[key];
          const isOffline =
            !cached?.timestamp || serverTime - cached.timestamp > TIMEOUT_MS;

          return {
            id: key,
            humidity: !isOffline ? cached?.humidity || "--" : "--",
            online: !isOffline,
            timestamp: cached?.timestamp || 0,
            age: cached?.timestamp ? serverTime - cached.timestamp : 0,
          };
        });

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
      <h2 className="text-center mt-4 mb-1">Моніторинг датчиків вологості:</h2>
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
