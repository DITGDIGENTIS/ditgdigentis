"use client";  // This marks the file as a client component

import { useEffect, useState } from "react";

export default function ZonaRelay() {
  const [relayStatus, setRelayStatus] = useState({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  useEffect(() => {
    // Функция для получения статуса реле с сервера
    const checkRemotePiStatus = () => {
      fetch("https://ditgdigentis.vercel.app/api/status", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          const zona = data.zona1;
          if (zona) {
            // Обновление состояния реле
            setRelayStatus({
              relay1: zona.relay1 === 1,
              relay2: zona.relay2 === 1,
              relay3: zona.relay3 === 1,
            });
          }
        })
        .catch(() => console.error("Error fetching relay status"));
    };

    // Получаем статус реле сразу и затем каждую секунду
    checkRemotePiStatus();
    const remotePiInterval = setInterval(checkRemotePiStatus, 10000); // обновление каждые 10 секунд

    return () => {
      clearInterval(remotePiInterval); // очищаем интервал при размонтировании
    };
  }, []);

  return (
    <div className="relay-container">
      <h2 className="relay-title text-center mt-4 mb-1">Моніторинг реле:</h2>
      <div className="relay-row">
        <div className="relay-col">
          <div className="relay-status-block">
            <div className="relay-description">
              Relay 1
              <button
                className={`relay-status-button ${relayStatus.relay1 ? "relay-online" : "relay-offline"}`}
                title={`Relay 1 ${relayStatus.relay1 ? "ON" : "OFF"}`}
              >
                ● {relayStatus.relay1 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
        <div className="relay-col">
          <div className="relay-status-block">
            <div className="relay-description">
              Relay 2
              <button
                className={`relay-status-button ${relayStatus.relay2 ? "relay-online" : "relay-offline"}`}
                title={`Relay 2 ${relayStatus.relay2 ? "ON" : "OFF"}`}
              >
                ● {relayStatus.relay2 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
        <div className="relay-col">
          <div className="relay-status-block">
            <div className="relay-description">
              Relay 3
              <button
                className={`relay-status-button ${relayStatus.relay3 ? "relay-online" : "relay-offline"}`}
                title={`Relay 3 ${relayStatus.relay3 ? "ON" : "OFF"}`}
              >
                ● {relayStatus.relay3 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Контейнер для реле */
        .relay-container {
          padding: 20px;
        }

        /* Заголовок секции реле */
        .relay-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 20px;
          color: #333;
        }

        /* Гибкая сетка для блоков реле */
        .relay-row {
          display: flex;
          justify-content: space-around;
          flex-wrap: wrap;
          gap: 20px;
        }

        .relay-col {
          width: 48%;
        }

        /* Блок статуса реле */
        .relay-status-block {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        /* Описание реле */
        .relay-description {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .relay-description span {
          font-size: 1.2rem;
          font-weight: 500;
          color: #333;
        }

        /* Кнопки для реле */
        .relay-status-button {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        /* Стиль для включённого реле */
        .relay-online {
          background-color: #28a745;
          box-shadow: 0 0 8px rgba(40, 167, 69, 0.5);
        }

        /* Стиль для выключенного реле */
        .relay-offline {
          background-color: #dc3545;
          box-shadow: 0 0 8px rgba(220, 53, 69, 0.5);
        }

        /* Стили для мобильных устройств */
        @media (max-width: 576px) {
          .relay-col {
            width: 100%;
          }

          .relay-status-button {
            width: 25px;
            height: 25px;
          }
        }
      `}</style>
    </div>
  );
}
