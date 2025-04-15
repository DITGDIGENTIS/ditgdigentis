"use client";

import { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

export function SensorMonitor() {
  // Состояния для всех датчиков
  const [zona1Temp, setZona1Temp] = useState<string>("--");
  const [zona1Online, setZona1Online] = useState<boolean>(false);

  const [zona1Sensor2Temp, setZona1Sensor2Temp] = useState<string>("--");
  const [zona1Sensor2Online, setZona1Sensor2Online] = useState<boolean>(false);

  const [zona1Sensor3Temp, setZona1Sensor3Temp] = useState<string>("--");
  const [zona1Sensor3Online, setZona1Sensor3Online] = useState<boolean>(false);

  const [zona1Sensor4Temp, setZona1Sensor4Temp] = useState<string>("--");
  const [zona1Sensor4Online, setZona1Sensor4Online] = useState<boolean>(false);

  // useRef для хранения последнего значения температуры для всех датчиков
  const lastTempRefZona1 = useRef<string>("--");
  const lastTempRefZona1Sensor2 = useRef<string>("--");
  const lastTempRefZona1Sensor3 = useRef<string>("--");
  const lastTempRefZona1Sensor4 = useRef<string>("--");

  // Для контроля времени последнего обновления
  const lastUpdateRefZona1 = useRef<number>(0);
  const lastUpdateRefZona1Sensor2 = useRef<number>(0);
  const lastUpdateRefZona1Sensor3 = useRef<number>(0);
  const lastUpdateRefZona1Sensor4 = useRef<number>(0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("https://ditgdigentis.vercel.app/api/status", {
          cache: "no-store", // Отключаем кеширование
        });
        const data = await res.json();
        const zona1 = data.zona1;
        const zona1_2 = data.zona1_2;
        const zona1_3 = data.zona1_3;
        const zona1_4 = data.zona1_4;

        const now = Date.now();

        // Обработка данных с первого датчика (zona1)
        if (zona1) {
          const diff = now - zona1.timestamp;
          const isOnline = diff < 30000;  // Проверка на свежесть данных
          setZona1Online(isOnline);

          const temp = zona1.temp;
          if (temp && temp !== "none") {
            const newTemp = parseFloat(temp);
            const currentTemp = parseFloat(lastTempRefZona1.current);

            // Если температура изменилась более чем на 0.1°C или прошло больше времени (например, 5 секунд)
            if (
              lastTempRefZona1.current === "--" ||
              isNaN(currentTemp) ||
              Math.abs(newTemp - currentTemp) >= 0.1 || 
              (now - lastUpdateRefZona1.current > 5000) // Обновляем не чаще чем раз в 5 секунд
            ) {
              setZona1Temp(temp);
              lastTempRefZona1.current = temp;
              lastUpdateRefZona1.current = now; // Обновляем время последнего обновления
            }
          }
        }

        // Обработка данных с второго датчика (zona1_2)
        if (zona1_2) {
          const diff = now - zona1_2.timestamp;
          const isOnline = diff < 30000;  // Проверка на то, что данные не старше 30 секунд
          setZona1Sensor2Online(isOnline);

          const temp = zona1_2.temp;
          if (temp && temp !== "none") {
            const newTemp = parseFloat(temp);
            const currentTemp = parseFloat(lastTempRefZona1Sensor2.current);

            // Если температура изменилась более чем на 0.1°C или прошло больше времени (например, 5 секунд)
            if (
              lastTempRefZona1Sensor2.current === "--" ||
              isNaN(currentTemp) ||
              Math.abs(newTemp - currentTemp) >= 0.1 || 
              (now - lastUpdateRefZona1Sensor2.current > 5000) // Обновляем не чаще чем раз в 5 секунд
            ) {
              setZona1Sensor2Temp(temp);
              lastTempRefZona1Sensor2.current = temp;
              lastUpdateRefZona1Sensor2.current = now; // Обновляем время последнего обновления
            }
          }
        }

        // Обработка данных с третьего датчика (zona1_3)
        if (zona1_3) {
          const diff = now - zona1_3.timestamp;
          const isOnline = diff < 30000;
          setZona1Sensor3Online(isOnline);

          const temp = zona1_3.temp;
          if (temp && temp !== "none") {
            const newTemp = parseFloat(temp);
            const currentTemp = parseFloat(lastTempRefZona1Sensor3.current);

            if (
              lastTempRefZona1Sensor3.current === "--" ||
              isNaN(currentTemp) ||
              Math.abs(newTemp - currentTemp) >= 0.1 ||
              (now - lastUpdateRefZona1Sensor3.current > 5000)
            ) {
              setZona1Sensor3Temp(temp);
              lastTempRefZona1Sensor3.current = temp;
              lastUpdateRefZona1Sensor3.current = now;
            }
          }
        }

        // Обработка данных с четвертого датчика (zona1_4)
        if (zona1_4) {
          const diff = now - zona1_4.timestamp;
          const isOnline = diff < 30000;
          setZona1Sensor4Online(isOnline);

          const temp = zona1_4.temp;
          if (temp && temp !== "none") {
            const newTemp = parseFloat(temp);
            const currentTemp = parseFloat(lastTempRefZona1Sensor4.current);

            if (
              lastTempRefZona1Sensor4.current === "--" ||
              isNaN(currentTemp) ||
              Math.abs(newTemp - currentTemp) >= 0.1 ||
              (now - lastUpdateRefZona1Sensor4.current > 5000)
            ) {
              setZona1Sensor4Temp(temp);
              lastTempRefZona1Sensor4.current = temp;
              lastUpdateRefZona1Sensor4.current = now;
            }
          }
        }

      } catch (error) {
        console.error("Error fetching status:", error);
        setZona1Online(false);
        setZona1Temp("--");
        setZona1Sensor2Online(false);
        setZona1Sensor2Temp("--");
        setZona1Sensor3Online(false);
        setZona1Sensor3Temp("--");
        setZona1Sensor4Online(false);
        setZona1Sensor4Temp("--");
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Обновление данных каждые 10 секунд
    return () => clearInterval(interval);
  }, [lastTempRefZona1, lastTempRefZona1Sensor2, lastTempRefZona1Sensor3, lastTempRefZona1Sensor4]);

  // Вычисление среднего значения температуры
  const averageTemp = (
    (parseFloat(zona1Temp) + parseFloat(zona1Sensor2Temp) + parseFloat(zona1Sensor3Temp) + parseFloat(zona1Sensor4Temp)) /
    4
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
        {/* Первый датчик */}
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

        {/* Второй датчик */}
        <div className="col-6 col-md-3">
          <div className="average-temp-block">
            <div className="description-temp-block">
              Zona:1_2 | Sensor:2
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

        {/* Третий датчик */}
        <div className="col-6 col-md-3">
          <div className="average-temp-block">
            <div className="description-temp-block">
              Zona:1_3 | Sensor:3
              <button
                className={`status-button ${zona1Sensor3Online ? "online" : "offline"}`}
                title={`Sensor ${zona1Sensor3Online ? "Online" : "Offline"}`}
              >
                ● {zona1Sensor3Online ? "ONLINE" : "OFFLINE"}
              </button>
            </div>
            <div className="average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span id="sensor3" className="average-temp-data">
                {zona1Sensor3Temp} °C
              </span>
            </div>
          </div>
        </div>

        {/* Четвертый датчик */}
        <div className="col-6 col-md-3">
          <div className="average-temp-block">
            <div className="description-temp-block">
              Zona:1_4 | Sensor:4
              <button
                className={`status-button ${zona1Sensor4Online ? "online" : "offline"}`}
                title={`Sensor ${zona1Sensor4Online ? "Online" : "Offline"}`}
              >
                ● {zona1Sensor4Online ? "ONLINE" : "OFFLINE"}
              </button>
            </div>
            <div className="average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span id="sensor4" className="average-temp-data">
                {zona1Sensor4Temp} °C
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
