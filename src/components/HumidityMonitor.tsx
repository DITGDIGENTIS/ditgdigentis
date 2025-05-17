"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faTemperatureLow } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";
import { HumidityDataPoint } from "../services/humidity.service";

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

  const saveToDatabase = async (sensorData: Record<string, RawHumidityItem>) => {
    try {
      const onlineSensors = _.pickBy(sensorData, (sensor) => {
        const age = Date.now() - Number(sensor.timestamp);
        return age <= TIMEOUT_MS;
      });

      if (_.isEmpty(onlineSensors)) return;

      const formattedSensors: HumidityDataPoint[] = _.map(onlineSensors, (sensor, id) => {
        const humidity = typeof sensor.humidity === 'string' 
          ? parseFloat(sensor.humidity) 
          : sensor.humidity;

        const temperature = typeof sensor.temperature === 'string'
          ? parseFloat(sensor.temperature)
          : sensor.temperature || 0;

        return {
          sensor_id: id,
          humidity: _.round(humidity, 1),
          temperature: _.round(temperature, 1),
          timestamp: new Date(Number(sensor.timestamp))
        };
      });

      console.log("[saveToDatabase] Saving sensor data:", formattedSensors);

      const response = await fetch("/api/humidity-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedSensors),
      });

      const result = await response.json();
      console.log("[saveToDatabase] Save result:", result);
    } catch (error) {
      console.error("Error saving humidity data:", error);
    }
  };

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { 
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!res.ok) return;

        const { sensors: data, serverTime }: RawHumidityResponse = await res.json();
        await saveToDatabase(data);

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
      } catch (err) {
        console.error("Error fetching humidity status:", err);
      }
    };

    fetchHumidity();
    const int = setInterval(fetchHumidity, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="container sensor-container">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчика вологості:</h2>
      
      <div className="row justify-content-center">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-12 col-md-8">
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
