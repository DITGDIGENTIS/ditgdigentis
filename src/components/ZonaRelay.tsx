"use client";  // This marks the file as a client component

import { useEffect, useState, CSSProperties } from "react";

export default function ZonaRelay() {
  const [relayStatus, setRelayStatus] = useState({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  // Стили для самих кнопок
  const buttonStyle: CSSProperties = {
    width: "50px",
    fontSize: "1.6em",
    padding: "5px 16px",
    cursor: "pointer",
    backgroundColor: "#2B2B2B",
    color: "#fff",
    border: "1px solid #999",
    borderRadius: "8px",
    boxShadow: "0 0 5px rgba(255, 215, 0, 0.3)",
    transition: "background-color 0.3s ease, box-shadow 0.3s ease",
    textAlign: "center",
  };

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
      <h2 className="relay-title text-center mt-4 mb-4">Моніторинг реле:</h2>
      <div className="relay-row">
        {/* Relay 1 */}
        <div className="col-4 col-md-4">
          <div className="relay-status-block-relay">
            <div className="relay-description-relay">
              Zona:1 | Relay:1
              <button
                style={buttonStyle}
                className={`relay-status-button-relay ${relayStatus.relay1 ? "relay-online-relay" : "relay-offline-relay"}`}
                title={`Relay 1 ${relayStatus.relay1 ? "ON" : "OFF"}`}
              >
                ● {relayStatus.relay1 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Relay 2 */}
        <div className="col-4 col-md-4">
          <div className="relay-status-block-relay">
            <div className="relay-description-relay">
              Zona:1 | Relay:2
              <button
                style={buttonStyle}
                className={`relay-status-button-relay ${relayStatus.relay2 ? "relay-online-relay" : "relay-offline-relay"}`}
                title={`Relay 2 ${relayStatus.relay2 ? "ON" : "OFF"}`}
              >
                ● {relayStatus.relay2 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Relay 3 */}
        <div className="col-4 col-md-4">
          <div className="relay-status-block-relay">
            <div className="relay-description-relay">
              Zona:1 | Relay:3
              <button
                style={buttonStyle}
                className={`relay-status-button-relay ${relayStatus.relay3 ? "relay-online-relay" : "relay-offline-relay"}`}
                title={`Relay 3 ${relayStatus.relay3 ? "ON" : "OFF"}`}
              >
                ● {relayStatus.relay3 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
