"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faTemperatureLow } from "@fortawesome/free-solid-svg-icons";

type RawHumidityItem = {
  id: string;
  humidity: number | string;
  temperature?: number | string;
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
  temperature: string;
  online: boolean;
  humidityLevel: "low" | "normal" | "high";
};

// Укажи всі потрібні слоти
const SENSOR_KEYS = ["HUM1-1", "HUM1-2"];
const TIMEOUT_MS = 2 * 60 * 1000;

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const response: RawHumidityResponse = await res.json();

        const serverTime = Number(response.serverTime) || Date.now();
        const data = response.sensors || {};

        const updatedList: HumidityData[] = SENSOR_KEYS.map((id) => {
          const raw = data[id];
          const ts = raw ? Number(raw.timestamp) : 0;
          const humidityVal = raw ? parseFloat(String(raw.humidity)) : NaN;
          const temperatureVal = raw ? parseFloat(String(raw.temperature)) : NaN;
          const age = !isNaN(ts) ? serverTime - ts : Infinity;
          const online = age < TIMEOUT_MS;

          let level: "low" | "normal" | "high" = "normal";
          if (!online || isNaN(humidityVal)) level = "low";
          else if (humidityVal < 30) level = "low";
          else if (humidityVal > 60) level = "high";

          return {
            id,
            humidity: online && !isNaN(humidityVal) ? humidityVal.toFixed(0) : "--",
            temperature: online && !isNaN(temperatureVal) ? temperatureVal.toFixed(1) : "--",
            online,
            humidityLevel: level,
          };
        });

        setSensors(updatedList);
      } catch (e) {
        console.error("Помилка завантаження вологості:", e);
      }
    };

    fetchHumidity();
    const interval = setInterval(fetchHumidity, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mt-4 mb-3">Моніторинг датчиків вологості:</h2>
      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-12 col-md-12 mb-3">
            <div className={`average-temp-block ${sensor.online ? "online" : "offline"} p-3 rounded shadow-sm`}>
              {!sensor.online && (
                <div className="alert alert-danger text-center p-2 mb-2">
                  ⚠ {sensor.id} не в мережі (понад 2 хвилини)
                </div>
              )}
              <div className="description-temp-block d-flex justify-content-between align-items-center mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${sensor.online ? "online" : "offline blink"}`}
                  title={sensor.online ? "Sensor Online" : "Sensor Offline"}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label fs-5 text-white">
                <FontAwesomeIcon icon={faTint} /> {sensor.humidity} %
              </div>
              <div className="average-temp-label fs-6 text-white">
                <FontAwesomeIcon icon={faTemperatureLow} /> {sensor.temperature} °C
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
