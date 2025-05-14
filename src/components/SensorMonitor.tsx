"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";
import { SensorDataBatch, SensorDataPoint } from "../services/sensor-data.service";

type RawSensorItem = {
  id: string;
  temperature: number | string;
  timestamp: number;
};

type RawSensorResponse = {
  sensors: Record<string, RawSensorItem>;
  serverTime: number;
};

type SensorData = {
  id: string;
  temp: string;
  online: boolean;
  timestamp: number;
  age: number;
};

const SENSOR_KEYS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const TIMEOUT_MS = 5 * 60 * 1000;

export function SensorMonitor() {
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, SensorData>>({});

  const saveToDatabase = async (sensorData: Record<string, RawSensorItem>) => {
    try {
      console.log("Raw sensor data:", sensorData);

      // Фильтруем только онлайн сенсоры
      const onlineSensors = _.pickBy(sensorData, (sensor) => {
        const age = Date.now() - sensor.timestamp;
        return age <= TIMEOUT_MS;
      });

      console.log("Online sensors:", onlineSensors);

      if (_.isEmpty(onlineSensors)) {
        console.log("No online sensors to save");
        return;
      }

      // Преобразуем данные в нужный формат
      const formattedSensors: SensorDataPoint[] = _.map(onlineSensors, (sensor, id) => {
        const temperature = typeof sensor.temperature === 'string' 
          ? parseFloat(sensor.temperature) 
          : sensor.temperature;

        if (isNaN(temperature)) {
          throw new Error(`Invalid temperature value for sensor ${id}: ${sensor.temperature}`);
        }

        // Преобразуем timestamp из миллисекунд в Date
        const timestamp = new Date(Number(sensor.timestamp));
        
        return {
          sensor_id: id,
          temperature: _.round(temperature, 2),
          humidity: 0,
          timestamp
        };
      });

      console.log("Formatted sensors:", formattedSensors);

      // Проверяем каждый сенсор перед отправкой
      formattedSensors.forEach((sensor, index) => {
        if (!sensor.sensor_id || typeof sensor.sensor_id !== 'string') {
          throw new Error(`Invalid sensor_id at index ${index}`);
        }
        if (typeof sensor.temperature !== 'number' || isNaN(sensor.temperature)) {
          throw new Error(`Invalid temperature at index ${index}`);
        }
        if (!(sensor.timestamp instanceof Date) || isNaN(sensor.timestamp.getTime())) {
          throw new Error(`Invalid timestamp at index ${index}`);
        }
      });

      const sensorBatch: SensorDataBatch = {
        sensors: formattedSensors
      };

      console.log("Final sensor batch:", JSON.stringify(sensorBatch, null, 2));

      const response = await fetch("/api/sensor-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sensorBatch),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error response:", errorData);
        throw new Error(
          `Failed to save sensor data: ${response.status} ${response.statusText}${
            errorData.details ? ` - ${errorData.details}` : ""
          }`
        );
      }

      const result = await response.json();
      console.log("Successfully saved sensor data:", result);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error saving sensor data:", error);
      setError(errorMessage);
    }
  };

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/sensors", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to fetch sensors: ${res.status} ${res.statusText}`);
        }

        const { sensors: data, serverTime }: RawSensorResponse = await res.json();
        console.log("Received sensor data:", data);

        // Сохраняем данные в базу
        await saveToDatabase(data);

        SENSOR_KEYS.forEach((key) => {
          const raw = data[key];
          if (!raw) return;
          const age = serverTime - raw.timestamp;

          cache.current[key] = {
            id: key,
            temp: Number(raw.temperature).toFixed(1),
            timestamp: raw.timestamp,
            age,
            online: age <= TIMEOUT_MS,
          };
        });

        const updated = SENSOR_KEYS.map((key) => {
          const s = cache.current[key] || {
            id: key,
            temp: "--",
            timestamp: 0,
            age: Infinity,
            online: false,
          };

          const isOffline = !s.timestamp || s.age > TIMEOUT_MS;

          return {
            ...s,
            temp: isOffline ? "--" : s.temp,
            online: !isOffline,
            age: serverTime - s.timestamp,
          };
        });

        setSensors(updated);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Error fetching sensor status:", err);
        setError(errorMessage);
      }
    };

    fetchStatus();
    const int = setInterval(fetchStatus, 5000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="container sensor-container p-2">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчиків температури:</h2>
      
      {error && (
        <div className="alert alert-danger text-center mb-3" role="alert">
          ⚠ Ошибка: {error}
        </div>
      )}

      <div className="row">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-6 col-md-3">
            {!sensor.online && (
              <div className="alert alert-danger text-center p-2 mb-2">
                ⚠ {sensor.id} не в мережі
              </div>
            )}
            <div className="average-temp-block rounded shadow-sm">
              <div className="description-temp-block d-flex justify-content-between mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${sensor.online ? "online" : "offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label text-white">
                <FontAwesomeIcon icon={faThermometerHalf} style={{ color: "#FFD700" }} />{" "}
                <span className="average-temp-data fw-bold">{sensor.temp} °C</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
