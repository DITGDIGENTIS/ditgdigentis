"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

// Типы данных для каждого датчика
type SensorData = {
  id: string;
  temp: string;
  online: boolean;
};

export function SensorMonitor() {
  // Состояние для всех датчиков
  const [sensors, setSensors] = useState<SensorData[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://ditgdigentis.vercel.app/api/status", {
          cache: "no-store", // Отключаем кеширование
        });
        const data: Record<string, { temp: string; timestamp: number }> = await res.json();

        console.log("Fetched data:", data); // Логируем все полученные данные

        // Создаём новый список датчиков
        const sensorList: SensorData[] = [];
        const now = Date.now();

        // Обрабатываем все полученные датчики
        for (const [key, sensorData] of Object.entries(data)) {
          if (key === "server") continue; // Пропускаем сервер

          const diff = now - sensorData.timestamp;
          const isOnline = diff < 30000; // Проверка на свежесть данных

          // Добавляем данные о датчике в список
          const temp = sensorData.temp || "--";
          sensorList.push({
            id: key,
            temp,
            online: isOnline,
          });
        }

        console.log("Sensors list:", sensorList); // Логируем список датчиков

        setSensors(sensorList);
      } catch (error) {
        console.error("Error fetching status:", error);
        setSensors([]);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Обновление данных каждые 10 секунд
    return () => clearInterval(interval);
  }, []);

  // Вычисление среднего значения температуры с защитой от деления на ноль
  const averageTemp =
    sensors.length > 0
      ? (
          sensors.reduce((acc, sensor) => acc + parseFloat(sensor.temp || "0"), 0) /
          sensors.length
        ).toFixed(2)
      : "--";

  return (
    <div className="container sensor-container p-4">
      <div className="row wrapper-sens-top">
        <h2 className="text-center mb-1">Середні показники:</h2>
        <div className="col-6 col-md-6 pb-2">
          <div className="top-average-temp-block">
            <div className="top-average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span id="averageTemperature" className="top-average-temp-data">
                {averageTemp} °C
              </span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-center mt-4 mb-1">Моніторинг сенсорів:</h2>

      <div className="row">
        {/* Отображаем все датчики */}
        {sensors.map((sensor, index) => (
          <div key={index} className="col-6 col-md-3">
            <div className="average-temp-block">
              <div className="description-temp-block">
                {sensor.id} {/* Название зоны */}
                <button
                  className={`status-button ${sensor.online ? "online" : "offline"}`}
                  title={`Sensor ${sensor.online ? "Online" : "Offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label">
                <FontAwesomeIcon icon={faThermometerHalf} />{" "}
                <span className="average-temp-data">
                  {sensor.temp} °C
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
