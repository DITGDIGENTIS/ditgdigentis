"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTint,
  faTemperatureLow,
  faPlug,
  faPlugCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";

// Обновляем типы для более строгой типизации
interface RawHumidityItem {
  id: string;
  humidity: number | string;
  temperature?: number | string;
  timestamp: number | string;
}

interface ProcessedSensorData {
  sensor_id: string;
  humidity: number;
  temperature: number;
  timestamp: Date;
}

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

type CacheData = Record<string, HumidityData> & {
  lastSaveTime?: number;
};

const SENSOR_KEYS = ["HUM1-1"];
const TIMEOUT_MS = 10 * 60 * 1000; // 10 хв
const BAUD_RATE = 9600;

export function HumidityMonitor() {
  const [sensors, setSensors] = useState<HumidityData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [port, setPort] = useState<SerialPort | null>(null);
  const cache = useRef<CacheData>({});
  const reader = useRef<ReadableStreamDefaultReader | null>(null);

  const connectToSensor = async () => {
    try {
      if (!navigator.serial) {
        return;
      }

      const newPort = await navigator.serial.requestPort();
      await newPort.open({ baudRate: BAUD_RATE });
      setPort(newPort);
      setIsConnected(true);

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = newPort.readable.pipeTo(
        textDecoder.writable
      );
      const newReader = textDecoder.readable.getReader();
      reader.current = newReader;

      // Начинаем читать данные
      while (true) {
        const { value, done } = await newReader.read();
        if (done) {
          break;
        }

        // Парсим данные с датчика
        try {
          const pairs = value.trim().split(",");
          const data: Record<string, string> = {};

          pairs.forEach((pair) => {
            const [key, value] = pair.split(":");
            if (key && value) {
              data[key.trim()] = value.trim();
            }
          });

          if (data.humidity && data.temperature) {
            const humidity = parseFloat(data.humidity);
            const temperature = parseFloat(data.temperature);

            if (!isNaN(humidity) && !isNaN(temperature)) {
              const sensorData = {
                sensors: {
                  "HUM1-1": {
                    id: "HUM1-1",
                    humidity: humidity,
                    temperature: temperature,
                    timestamp: Date.now(),
                  },
                },
              };

              const response = await fetch("/api/humidity", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "no-cache",
                  Pragma: "no-cache",
                },
                body: JSON.stringify(sensorData),
              });

              const result = await response.json();
            }
          } else {
          }
        } catch (error) {
          console.error("Ошибка обработки данных:", error);
        }
      }
    } catch (error) {
      console.error("Ошибка подключения к датчику:", error);
      setIsConnected(false);
      setPort(null);
    }
  };

  const disconnectFromSensor = async () => {
    try {
      if (reader.current) {
        await reader.current.cancel();
        reader.current = null;
      }
      if (port) {
        await port.close();
        setPort(null);
      }
      setIsConnected(false);
    } catch (error) {
      console.error("Ошибка при отключении:", error);
    }
  };

  const saveToDatabase = async (
    sensorData: Record<string, RawHumidityItem>
  ) => {
    try {
      const onlineSensors = _.pickBy(sensorData, (sensor) => {
        const age = Date.now() - Number(sensor.timestamp);
        const isOnline = age <= TIMEOUT_MS;
        return isOnline;
      });

      if (_.isEmpty(onlineSensors)) {
        return;
      }

      const formattedSensors = _.map(onlineSensors, (sensor, id) => {
        const humidity =
          typeof sensor.humidity === "string"
            ? parseFloat(sensor.humidity)
            : sensor.humidity;

        const temperature =
          typeof sensor.temperature === "string"
            ? parseFloat(sensor.temperature)
            : sensor.temperature || 0;

        // Проверяем валидность значений
        if (isNaN(humidity) || isNaN(temperature)) {
          return null;
        }

        const timestamp = new Date(Number(sensor.timestamp));
        if (isNaN(timestamp.getTime())) {
          return null;
        }

        return {
          sensor_id: id,
          humidity: _.round(humidity, 1),
          temperature: _.round(temperature, 1),
          timestamp,
        };
      }).filter((s): s is ProcessedSensorData => s !== null);

      if (formattedSensors.length === 0) {
        return;
      }

      const response = await fetch("/api/humidity-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
        body: JSON.stringify(formattedSensors),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Ошибка сохранения: ${response.status} ${response.statusText}\n${errorText}`
        );
      }

      const result = await response.json();
    } catch (error) {
      console.error("[saveToDatabase] Ошибка:", error);
    }
  };

  useEffect(() => {
    const fetchHumidity = async () => {
      try {
        const res = await fetch("/api/humidity", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!res.ok) {
          return;
        }

        const { sensors: data, serverTime }: RawHumidityResponse =
          await res.json();

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
    const int = setInterval(fetchHumidity, 3000);
    return () => {
      clearInterval(int);
      disconnectFromSensor();
    };
  }, []);

  return (
    <div className="container sensor-container">
      <h2 className="text-center mt-4 mb-1">Моніторинг датчика вологості:</h2>

      <div className="row justify-content-center mb-4">
        <div className="col-12 col-md-8 text-center">
          <button
            type="button"
            onClick={isConnected ? disconnectFromSensor : connectToSensor}
            className={`btn ${isConnected ? "btn-danger" : "btn-primary"} mb-3`}
          >
            <FontAwesomeIcon
              icon={isConnected ? faPlugCircleXmark : faPlug}
              className="me-2"
            />
            {isConnected ? "Відключити датчик" : "Підключити датчик"}
          </button>
        </div>
      </div>

      <div className="row justify-content-center">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="col-12 col-md-8">
            <div className="average-temp-block p-3 rounded shadow-sm">
              <div className="description-temp-block d-flex justify-content-between mb-2">
                <strong>{sensor.id}</strong>
                <button
                  className={`status-button ${
                    sensor.online ? "online" : "offline"
                  }`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label d-flex justify-content-between gap-3 text-yellow">
                <div>
                  <FontAwesomeIcon icon={faTint} />{" "}
                  <span
                    className="average-temp-data fw-bold"
                    style={{
                      fontSize: "1.6rem",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    {sensor.humidity} %
                  </span>
                </div>
                <div>
                  <FontAwesomeIcon icon={faTemperatureLow} />{" "}
                  <span
                    className="average-temp-data fw-bold"
                    style={{
                      fontSize: "1.6rem",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
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
