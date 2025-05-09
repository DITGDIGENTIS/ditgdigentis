"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faTemperatureLow } from "@fortawesome/free-solid-svg-icons";

type RawHumidityItem = {
  id: string;
  humidity: number | string;
  temperature?: number | string;
  timestamp: number | string;
};

type RawHumidityResponse = {
  sensors: Record<string, RawHumidityItem>;
  serverTime: number;
};

type HumidityData = {
  id: string;
  humidity: string;
  temperature: string;
  online: boolean;
  timestamp: number;
  age: number;
};

const SENSOR_KEYS = ["HUM1-1"];
const TIMEOUT_MS = 10 * 60 * 1000; // 10 хв

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);
  const cache = useRef<Record<string, HumidityData>>({});

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const { sensors: data, serverTime }: RawHumidityResponse = await res.json();

        SENSOR_KEYS.forEach((key) => {
          const raw = data?.[key];
          if (!raw) return;

          const ts = Number(raw.timestamp);
          const h = parseFloat(String(raw.humidity));
          const t = parseFloat(String(raw.temperature));
          const age = serverTime - ts;

          if (!isNaN(h) && !isNaN(t)) {
            cache.current[key] = {
              id: key,
              humidity: h.toFixed(1),
              temperature: t.toFixed(1),
              timestamp: ts,
              age,
              online: age <= TIMEOUT_MS,
            };
          }
        });

        const updated = SENSOR_KEYS.map((key) => {
          const s = cache.current[key] || {
            id: key,
            humidity: "--",
            temperature: "--",
            timestamp: 0,
            age: Infinity,
            online: false,
          };

          const isOffline = !s.timestamp || s.age > TIMEOUT_MS;

          return {
            ...s,
            humidity: isOffline ? "--" : s.humidity,
            temperature: isOffline ? "--" : s.temperature,
            online: !isOffline,
            age: serverTime - s.timestamp,
          };
        });

        setSensors(updated);
      } catch (e) {
        console.error("❌ HUM fetch error:", e);
        setSensors(SENSOR_KEYS.map((id) => ({
          id,
          humidity: "--",
          temperature: "--",
          timestamp: 0,
          age: Infinity,
          online: false,
        })));
      }
    };

    fetchHumidity();
    const int = setInterval(fetchHumidity, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="container sensor-container ">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчика вологості:</h2>
      <div className="row justify-content-center">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-12 col-md-8">
            {!sensor.online && (
              <div className="alert alert-danger text-center p-2 mb-2">
                ⚠ {sensor.id} не в мережі
              </div>
            )}
            <div className="average-temp-block p-3 rounded shadow-sm">
              <div className="description-temp-block d-flex justify-content-between mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${sensor.online ? "online" : "offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label d-flex justify-content-between gap-3 text-yellow">
                <div>
                  <FontAwesomeIcon icon={faTint} />{" "}
                  <span className="average-temp-data fw-bold" style={{ fontSize: "1.6rem", color: "#fff", fontWeight: "bold" }}>
                    {sensor.humidity} %
                  </span>
                </div>
                <div>
                  <FontAwesomeIcon icon={faTemperatureLow} />{" "}
                  <span className="average-temp-data fw-bold" style={{ fontSize: "1.6rem", color: "#fff", fontWeight: "bold" }}>
                    {sensor.temperature} °C
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
