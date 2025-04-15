"use client";

import { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

export function SensorMonitor() {
  // Состояние для температуры первого датчика (zona1)
  const [zona1Temp, setZona1Temp] = useState<string>("--");
  // Состояние для статуса первого датчика: онлайн/офлайн
  const [zona1Online, setZona1Online] = useState<boolean>(false);

  // Состояние для температуры второго датчика (zona1_2)
  const [zona1Sensor2Temp, setZona1Sensor2Temp] = useState<string>("--");
  // Состояние для статуса второго датчика: онлайн/офлайн
  const [zona1Sensor2Online, setZona1Sensor2Online] = useState<boolean>(false);

  // useRef для хранения последнего значения температуры для обоих датчиков
  const lastTempRefZona1 = useRef<string>("--");
  const lastTempRefZona1Sensor2 = useRef<string>("--");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://ditgdigentis.vercel.app/api/status", {
          cache: "no-store", // Отключаем кеширование
        });
        const data = await res.json();
        const zona1 = data.zona1;
        const zona1_2 = data.zona1_2;

        // Обработка данных с первого датчика (zona1)
        if (zona1) {
          const now = Date.now();
          const diff = now - zona1.timestamp;
          const isOnline = diff < 30000;
          setZona1Online(isOnline);

          const temp = zona1.temp;
          if (temp && temp !== "none") {
            const newTemp = parseFloat(temp);
            const currentTemp = parseFloat(lastTempRefZona1.current);
            if (
              lastTempRefZona1.current === "--" ||
              isNaN(currentTemp) ||
              Math.abs(newTemp - currentTemp) >= 0.1
            ) {
              setZona1Temp(temp);
              lastTempRefZona1.current = temp;
            }
          }
        }

        // Обработка данных с второго датчика (zona1_2)
        if (zona1_2) {
          const now = Date.now();
          const diff = now - zona1_2.timestamp;
          const isOnline = diff < 30000;
          setZona1Sensor2Online(isOnline);

          const temp = zona1_2.temp;
          if (temp && temp !== "none") {
            const newTemp = parseFloat(temp);
            const currentTemp = parseFloat(lastTempRefZona1Sensor2.current);
            if (
              lastTempRefZona1Sensor2.current === "--" ||
              isNaN(currentTemp) ||
              Math.abs(newTemp - currentTemp) >= 0.1
            ) {
              setZona1Sensor2Temp(temp);
              lastTempRefZona1Sensor2.current = temp;
            }
          }
        }
      } catch (error) {
        console.error("Error fetching status:", error);
        setZona1Online(false);
        setZona1Temp("--");
        setZona1Sensor2Online(false);
        setZona1Sensor2Temp("--");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Обновление данных каждые 10 секунд
    return () => clearInterval(interval);
  }, [lastTempRefZona1, lastTempRefZona1Sensor2]);

  // Вычисление среднего значения температуры
  const averageTemp = (
    (parseFloat(zona1Temp) + parseFloat(zona1Sensor2Temp)) /
    2
  ).toFixed(2);

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

        <div className="col-6 col-md-3">
          <div className="average-temp-block">
            <div className="description-temp-block">
              Zona:1 | Sensor:2
              <button
                className={`status-button ${zona1Sensor2Online ? "online" : "offline"}`}
                title={`Sensor ${zona1Sensor2Online ? "Online" : "Offline"}`}
              >
                ● {zona1Sensor2Online ? "ONLINE" : "OFFLINE"}
              </button>
            </div>
            <div className="average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span id="sensor2" className="average-temp-data">
                {zona1Sensor2Temp} °C
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
