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
  const [sensors, setSensors] = useState<SensorData[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();

        const sensorList: SensorData[] = [];
        const now = Date.now();

        // Итерируем по всем ключам в data
        for (const zone in data) {
          const sensorData = data[zone];
          const isOnline = sensorData
            ? now - sensorData.timestamp < 30000 // Проверка на свежесть данных
            : false;

          sensorList.push({
            id: zone,
            temp: sensorData?.temperature ? sensorData.temperature.toFixed(2) : "--", // Если данных нет, показываем "--"
            online: isOnline,
          });
        }

        setSensors(sensorList);
      } catch (error) {
        console.error("Error fetching status:", error);
        setSensors([]); // Если ошибка, очищаем данные
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Обновление данных каждые 10 секунд
    return () => clearInterval(interval);
  }, []);

  const averageTemp =
    sensors.length > 0
      ? (sensors.reduce((acc, sensor) => acc + parseFloat(sensor.temp || "0"), 0) /
          sensors.length).toFixed(2)
      : "--";

  return (
    <div className="container sensor-container p-4">
      <div className="row wrapper-sens-top">
        <h2 className="text-center mb-1">Средние показания:</h2>
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

      <h2 className="text-center mt-4 mb-1">Мониторинг датчиков:</h2>

      <div className="row">
        {sensors.map((sensor, index) => (
          <div key={index} className="col-6 col-md-3">
            <div className="average-temp-block">
              <div className="description-temp-block">
                {sensor.id}
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
