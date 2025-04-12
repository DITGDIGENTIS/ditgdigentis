"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

export function SensorMonitor() {
  const [zona1Temp, setZona1Temp] = useState<string>("--");
  const [zona1Online, setZona1Online] = useState<boolean>(false);
  const [lastTemp, setLastTemp] = useState<string | null>(null); // Храним последнее значение температуры

  // Стейт для реле
  const [relayStatus, setRelayStatus] = useState<{ [key: string]: boolean }>({
    relay1: false,
    relay2: false,
    relay3: false,
  });

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

          if (temp !== lastTemp && temp !== "none") {
            const tempNum = parseFloat(temp);

            // Фильтрация изменений: обновляем только если температура изменилась более чем на 0.1°C
            if (Math.abs(tempNum - parseFloat(lastTemp || "0")) >= 0.1) {
              setZona1Temp(temp);
              setLastTemp(temp); // Обновляем последнее значение температуры
            }
          }

          // Обновляем статус реле (предполагаем, что реле передаются как relay1, relay2, relay3)
          setRelayStatus({
            relay1: zona.relay1 === 1,
            relay2: zona.relay2 === 1,
            relay3: zona.relay3 === 1,
          });
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
    const interval = setInterval(fetchStatus, 10000); // Обновляем данные каждые 10 секунд
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

        {/* Вывод статуса реле */}
        {["relay1", "relay2", "relay3"].map((relay, index) => (
          <div key={relay} className="col-6 col-md-3">
            <div className="average-temp-block">
              <div className="description-temp-block">
                Zona:1 | {`Relay ${index + 1}`}
                <button
                  className={`status-button ${relayStatus[relay] ? "online" : "offline"}`}
                  title={`${relay} ${relayStatus[relay] ? "ON" : "OFF"}`}
                >
                  ● {relayStatus[relay] ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
    