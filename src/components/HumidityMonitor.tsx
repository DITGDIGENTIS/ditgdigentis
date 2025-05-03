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
  offlineSince?: number;
  showAlert: boolean;
};

const SENSOR_KEYS = ["HUM1-1"];
const TIMEOUT_MS = 2 * 60 * 1000;
const ALERT_TIMEOUT_MS = 5 * 60 * 1000;

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);
  const cache = useRef<Record<string, HumidityData>>({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const { sensors: data, serverTime }: RawHumidityResponse = await res.json();

        SENSOR_KEYS.forEach((key) => {
          const raw = data?.[key];
          const prev = cache.current[key];
          const ts = Number(raw?.timestamp || 0);
          const h = parseFloat(String(raw?.humidity));
          const t = parseFloat(String(raw?.temperature));
          const age = serverTime - ts;
          const isOnline = raw && !isNaN(h) && !isNaN(t) && age <= TIMEOUT_MS;

          if (isOnline) {
            cache.current[key] = {
              id: key,
              humidity: h.toFixed(0),
              temperature: t.toFixed(1),
              timestamp: ts,
              age,
              online: true,
              offlineSince: undefined,
              showAlert: false,
            };
          } else {
            const wasOffline = prev?.online === false;
            const offlineSince = wasOffline ? prev.offlineSince : serverTime;
            const offlineDuration = serverTime - (offlineSince ?? serverTime);

            cache.current[key] = {
              id: key,
              humidity: "--",
              temperature: "--",
              timestamp: prev?.timestamp || 0,
              age,
              online: false,
              offlineSince,
              showAlert: offlineDuration > ALERT_TIMEOUT_MS,
            };
          }
        });

        const updated = SENSOR_KEYS.map((key) => cache.current[key]!);
        setSensors(updated);
      } catch (e) {
        console.error("❌ HUM fetch error:", e);
        const fallback = SENSOR_KEYS.map((id) => ({
          id,
          humidity: "--",
          temperature: "--",
          timestamp: 0,
          age: Infinity,
          online: false,
          offlineSince: Date.now(),
          showAlert: true,
        }));
        setSensors(fallback);
      }
    };

    fetchStatus();
    const int = setInterval(fetchStatus, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчика вологості:</h2>
      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-12 col-md-3">
            {sensor.showAlert && (
              <div className="alert alert-danger text-center p-2 mb-2">
                ⚠ {sensor.id} не в мережі понад 5 хв
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
              <div className="average-temp-label d-flex justify-content-between gap-3 text-white">
                <div>
                  <FontAwesomeIcon icon={faTint} style={{ color: "#FFD700" }} />{" "}
                  <span className="average-temp-data fw-bold">
                    {sensor.humidity} %
                  </span>
                </div>
                <div>
                  <FontAwesomeIcon icon={faTemperatureLow} style={{ color: "#FFD700" }} />{" "}
                  <span className="average-temp-data fw-bold">
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
