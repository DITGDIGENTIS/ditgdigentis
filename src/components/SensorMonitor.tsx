"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

export function SensorMonitor() {
  const [zona1Temp, setZona1Temp] = useState<string>("--");
  const [zona1Online, setZona1Online] = useState<boolean>(false);
  const [lastTemp, setLastTemp] = useState<string | null>(null); // Для хранения последнего значения температуры
  const TEMP_CHANGE_THRESHOLD = 0.1; // Порог изменения температуры в градусах Цельсия

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://ditgdigentis.vercel.app/api/status", {
          cache: "no-store", // Отключаем кеширование
        });
        const data = await res.json();
        const zona = data.zona1;

        if (zona) {
          const now = Date.now();
          const diff = now - zona.timestamp;
          const isOnline = diff < 30000;
          setZona1Online(isOnline);

          const temp = zona.temp;
          console.log("Fetched Temperature:", temp);  // Логируем температуру

          if (temp && lastTemp) {
            // Проверяем, если изменение температуры больше порога
            const tempDiff = Math.abs(parseFloat(temp) - parseFloat(lastTemp));

            if (tempDiff >= TEMP_CHANGE_THRESHOLD) {
              setZona1Temp(temp);
              setLastTemp(temp); // Обновляем последнее значение температуры
            }
          } else {
            // Если это первое значение, просто сохраняем его
            setZona1Temp(temp);
            setLastTemp(temp);
          }
        } else {
          setZona1Online(false);
          setZona1Temp("--");
        }
      } catch (error) {
        console.error("Error fetching status:", error);  // Логируем ошибку
        setZona1Online(false);
        setZona1Temp("--");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Обновляем данные каждые 5 секунд
    return () => clearInterval(interval);
  }, [lastTemp]); // Зависимость от lastTemp, чтобы следить за изменениями температуры

  return (
    <div className="container sensor-container p-4">
      <div className="row wrapper-sens-top">
        <h2 className="text-center mb-1">Середні показники:</h2>
        <div className="col-6 col-md-6 pb-2">
          <div className="top-average-temp-block">
            <div className="top-average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span id="averageTemperature" className="top-average-temp-data">
                {zona1Temp} °C
              </span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-center mt-4 mb-1">Моніторинг сенсорів:</h2>

      <div className="row">
        <div className="col-6 col-md-3">
          <div className="average-temp-block">
            <div className="description-temp-block">
              Zona:1 | Sensor:1
              <button
                className={`status-button ${zona1Online ? "online" : "offline"}`}
                title={`Sensor ${zona1Online ? "Online" : "Offline"}`}
              >
                ● {zona1Online ? "ONLINE" : "OFFLINE"}
              </button>
            </div>
            <div className="average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span id="sensor1" className="average-temp-data">
                {zona1Temp} °C
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
