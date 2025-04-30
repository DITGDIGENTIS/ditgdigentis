"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint } from "@fortawesome/free-solid-svg-icons";

type RawHumidityItem = {
  id: string;
  humidity: number | string;
  timestamp: number | string;
};

type RawHumidityResponse = {
  sensors: {
    [sensorKey: string]: RawHumidityItem;
  };
  serverTime: number | string;
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
        const serverTimeRaw = response.serverTime;
        const data = response.sensors || {};

        const serverTime = Number(serverTimeRaw);
        const validServerTime = !isNaN(serverTime) && serverTime > 0;

        const updatedList: HumidityData[] = Object.entries(data).map(([id, raw]) => {
          const ts = Number(raw.timestamp);
          const humidityStr = raw.humidity?.toString() || "--";

          const validTimestamp = !isNaN(ts) && ts > 0;
          const age = validTimestamp && validServerTime ? serverTime - ts : 0;

          const online =
            humidityStr !== "--" &&
            validTimestamp &&
            validServerTime &&
            age >= 0 &&
            age < TIMEOUT_MS;

          console.log(
            `[DEBUG] ${id}: humidity=${humidityStr}, ts=${ts}, serverTime=${serverTime}, age=${age}, online=${online}`
          );

          return {
            id,
            humidity: humidityStr,
            timestamp: ts,
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
      <h2 className="text-center mt-4 mb-3">Моніторинг датчика вологості:</h2>
      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-12 col-md-12 mb-3">
            <div
              className={`average-temp-block ${
                sensor.online ? "online" : "offline"
              } p-3 rounded shadow-sm`}
            >
              {!sensor.online && (
                <div className="alert alert-danger text-center p-2 mb-2">
                  ⚠ {sensor.id} не в мережі
                </div>
              )}
              <div className="description-temp-block d-flex justify-content-between align-items-center mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${
                    sensor.online ? "online" : "offline"
                  }`}
                  title={`Sensor ${sensor.online ? "Online" : "Offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label fs-5">
                <FontAwesomeIcon icon={faTint} />{" "}
                <span className="average-temp-data fw-bold">
                  {sensor.humidity} %
                </span>
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
