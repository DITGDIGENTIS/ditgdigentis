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
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, HumidityData>>({});

  const saveToDatabase = async (sensorData: Record<string, RawHumidityItem>) => {
    try {
      console.log("Raw humidity data:", sensorData);

      // Фильтруем только онлайн сенсоры
      const onlineSensors = _.pickBy(sensorData, (sensor) => {
        const age = Date.now() - Number(sensor.timestamp);
        return age <= TIMEOUT_MS;
      });

      console.log("Online humidity sensors:", onlineSensors);

      if (_.isEmpty(onlineSensors)) {
        console.log("No online humidity sensors to save");
        return;
      }

      // Преобразуем данные в нужный формат
      const formattedSensors: HumidityDataPoint[] = _.map(onlineSensors, (sensor, id) => {
        const humidity = typeof sensor.humidity === 'string' 
          ? parseFloat(sensor.humidity) 
          : sensor.humidity;

        const temperature = typeof sensor.temperature === 'string'
          ? parseFloat(sensor.temperature)
          : sensor.temperature || 0;

        if (isNaN(humidity)) {
          throw new Error(`Invalid humidity value for sensor ${id}: ${sensor.humidity}`);
        }

        if (isNaN(temperature)) {
          throw new Error(`Invalid temperature value for sensor ${id}: ${sensor.temperature}`);
        }

        // Преобразуем timestamp из миллисекунд в Date
        const timestamp = new Date(Number(sensor.timestamp));
        
        return {
          sensor_id: id,
          humidity: _.round(humidity, 2),
          temperature: _.round(temperature, 2),
          timestamp
        };
      });

      console.log("Formatted humidity sensors:", formattedSensors);

      // Проверяем каждый сенсор перед отправкой
      formattedSensors.forEach((sensor, index) => {
        if (!sensor.sensor_id || typeof sensor.sensor_id !== 'string') {
          throw new Error(`Invalid sensor_id at index ${index}`);
        }
        if (typeof sensor.humidity !== 'number' || isNaN(sensor.humidity)) {
          throw new Error(`Invalid humidity at index ${index}`);
        }
        if (typeof sensor.temperature !== 'number' || isNaN(sensor.temperature)) {
          throw new Error(`Invalid temperature at index ${index}`);
        }
        if (!(sensor.timestamp instanceof Date) || isNaN(sensor.timestamp.getTime())) {
          throw new Error(`Invalid timestamp at index ${index}`);
        }
      });

      const response = await fetch("/api/humidity-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedSensors),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error response:", errorData);
        throw new Error(
          `Failed to save humidity data: ${response.status} ${response.statusText}${
            errorData.details ? ` - ${errorData.details}` : ""
          }`
        );
      }

      const result = await response.json();
      console.log("Successfully saved humidity data:", result);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error saving humidity data:", error);
      setError(errorMessage);
    }
  };

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to fetch humidity: ${res.status} ${res.statusText}`);
        }

        const { sensors: data, serverTime }: RawHumidityResponse = await res.json();
        console.log("Received humidity data:", data);

        // Сохраняем данные в базу
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
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Error fetching humidity status:", err);
        setError(errorMessage);
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
    <div className="container sensor-container">
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
