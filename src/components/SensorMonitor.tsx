"use client";

import { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

export function SensorMonitor() {
  // Состояние для температуры сенсора
  const [zona1Temp, setZona1Temp] = useState<string>("--");
  // Состояние для статуса: онлайн/офлайн
  const [zona1Online, setZona1Online] = useState<boolean>(false);
  // useRef для хранения последнего значения температуры, чтобы избежать лишних обновлений
  const lastTempRef = useRef<string>("--");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://ditgdigentis.vercel.app/api/status", {
          cache: "no-store",
        });
        const data = await res.json();
        const zona = data.zona1;

        if (zona) {
          const now = Date.now();
          const diff = now - zona.timestamp;
          // Считаем, что сенсор онлайн, если данные свежие (менее 30 секунд)
          const isOnline = diff < 30000;
          setZona1Online(isOnline);

          const temp = zona.temp;
          // Если значение температуры получено и отличается от ранее установленного более чем на 0.1°C
          if (temp && temp !== "none") {
            const newTemp = parseFloat(temp);
            const currentTemp = parseFloat(lastTempRef.current);
            if (
              lastTempRef.current === "--" ||
              isNaN(currentTemp) ||
              Math.abs(newTemp - currentTemp) >= 0.1
            ) {
              setZona1Temp(temp);
              lastTempRef.current = temp;
            }
          }
        } else {
          setZona1Online(false);
          setZona1Temp("--");
        }
      } catch (error) {
        console.error("Error fetching status:", error);
        setZona1Online(false);
        setZona1Temp("--");
      }
    };

    // Первоначальный вызов и обновление каждые 10 секунд
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
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
