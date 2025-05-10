"use client";

import { FC, useState, useEffect } from "react";
import { LogoutButton } from "../LogoutButton";
import { SensorDataBatch, SensorDataPoint } from "../../services/sensor-data.service";
import _ from "lodash";

export const Test: FC = () => {
  const [loading, setLoading] = useState(false);
  const [readings, setReadings] = useState<SensorDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/sensor-records");
      
      if (!response.ok) {
        throw new Error("Failed to fetch readings");
      }

      const data = await response.json();
      setReadings(data.readings);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      console.error("Error fetching readings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const handleClick = async () => {
    try {
      setLoading(true);
      setError(null);

      const sensorData: SensorDataBatch = {
        sensors: [
          {
            sensor_id: "sensor_1",
            temperature: 25.5,
            humidity: 60.0,
          },
          {
            sensor_id: "sensor_2",
            temperature: 26.0,
            humidity: 58.5,
          },
        ],
      };

      const response = await fetch("/api/sensor-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sensorData),
      });

      if (!response.ok) {
        throw new Error("Failed to create records");
      }

      const data = await response.json();
      console.log("Records created:", data);
      
      // Обновляем данные после создания новых записей
      await fetchReadings();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      console.error("Error creating records:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <LogoutButton />
      </div>
      <h1>🔐 Страница Test</h1>
      <p>Вы успешно авторизовались.</p>

      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          marginBottom: "1rem",
        }}
      >
        {loading ? "Создание записей..." : "Создать записи"}
      </button>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>
          Ошибка: {error}
        </div>
      )}

      <div>
        <h2>Показания сенсоров:</h2>
        {loading ? (
          <p>Загрузка данных...</p>
        ) : readings.length > 0 ? (
          <div style={{ display: "grid", gap: "1rem" }}>
            {_.map(readings, (reading, index) => (
              <div
                key={`${reading.sensor_id}-${index}`}
                style={{
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#f8f9fa",
                }}
              >
                <h3>Сенсор: {reading.sensor_id}</h3>
                <p>Температура: {reading.temperature}°C</p>
                <p>Влажность: {reading.humidity}%</p>
                <p>
                  Время:{" "}
                  {reading.timestamp
                    ? new Date(reading.timestamp).toLocaleString()
                    : "Не указано"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>Нет данных для отображения</p>
        )}
      </div>
    </div>
  );
};
