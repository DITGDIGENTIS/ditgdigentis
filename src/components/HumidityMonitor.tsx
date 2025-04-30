"use client";

import { useEffect, useState } from "react";
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
  timestamp: number;
  age: number;
  online: boolean;
};

const TIMEOUT_MS = 5 * 60 * 1000; // 5 минут

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const response: RawHumidityResponse = await res.json();
        const serverTime = response.serverTime;
        const data = response.sensors || {};

        const updatedList: HumidityData[] = Object.entries(data).map(([id, raw]) => {
          const humidityStr = raw.humidity?.toString() || "--";
          const age = serverTime - raw.timestamp;
          const online = humidityStr !== "--" && age < TIMEOUT_MS;

          return {
            id,
            humidity: online ? humidityStr : "--",
            timestamp: raw.timestamp,
            age,
            online,
          };
        });

        setSensors(updatedList.sort((a, b) => a.id.localeCompare(b.id)));
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
      }
    };

    fetchHumidity();
    const interval = setInterval(fetchHumidity, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчика вологості:</h2>
      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-12 col-md-12">
            <div className={`average-temp-block ${sensor.online ? "online" : "offline"}`}>
              {!sensor.online && (
                <div className="alert alert-danger text-center p-2 mb-2">
                  ⚠ {sensor.id} не в мережі
                </div>
              )}
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
              <div className="text-muted small mt-1">
                Оновлено: {(sensor.age / 1000).toFixed(0)} сек. тому
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
