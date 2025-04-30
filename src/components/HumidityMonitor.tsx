"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint } from "@fortawesome/free-solid-svg-icons";

type RawHumidityItem = {
  id: string;
  humidity: number | string;
};

type RawHumidityResponse = {
  sensors: {
    [sensorKey: string]: RawHumidityItem;
  };
};

type HumidityData = {
  id: string;
  humidity: string;
  online: boolean;
};

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const response: RawHumidityResponse = await res.json();
        const data = response.sensors || {};

        const updatedList: HumidityData[] = Object.entries(data).map(([id, raw]) => {
          const humidityStr = raw.humidity?.toString() || "--";
          const online = humidityStr !== "--";

          return {
            id,
            humidity: humidityStr,
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
          <div key={sensor.id} className="col-12 col-md-12 mb-3">
            <div className={`average-temp-block ${sensor.online ? "online" : "offline"} p-3 rounded shadow-sm`}>
              {!sensor.online && (
                <div className="alert alert-danger text-center p-2 mb-2">
                  ⚠ {sensor.id} не в мережі
                </div>
              )}
              <div className="description-temp-block d-flex justify-content-between align-items-center mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${sensor.online ? "online" : "offline"}`}
                  title={`Sensor ${sensor.online ? "Online" : "Offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label fs-5">
                <FontAwesomeIcon icon={faTint} />{" "}
                <span className="average-temp-data fw-bold">{sensor.humidity} %</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
