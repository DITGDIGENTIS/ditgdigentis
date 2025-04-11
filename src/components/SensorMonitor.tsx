"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

export function SensorMonitor() {
  const [zona1Temp, setZona1Temp] = useState<string>("--");
  const [zona1Online, setZona1Online] = useState<boolean>(false);

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

          const isTempValid =
            typeof temp === "string" &&
            temp !== "none" &&
            !isNaN(parseFloat(temp));

          setZona1Temp(isTempValid ? temp : "--");
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
    const interval = setInterval(fetchStatus, 1000); // Обновляем данные каждую секунду
    return () => clearInterval(interval);
  }, []);

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
