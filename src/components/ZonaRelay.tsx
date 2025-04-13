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
    padding: "10px 20px",
    fontSize: "1.2em",
    cursor: "pointer",
    border: "none",
    borderRadius: "50px",
    textAlign: "center",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "120px",
    height: "40px",
  };

  useEffect(() => {
    const checkRemotePiStatus = () => {
      fetch("https://ditgdigentis.vercel.app/api/status", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          const zona = data.zona1;
          if (zona) {
            setRelayStatus({
              relay1: zona.relay1 === 1,
              relay2: zona.relay2 === 1,
              relay3: zona.relay3 === 1,
            });
          }
        })
        .catch(() => console.error("Error fetching relay status"));
    };

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
        <div className="col-12 col-md-4">
          <div className="relay-status-block-relay">
            <div className="relay-description-relay">
              Zona:1 | Relay:1
            </div>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: relayStatus.relay1 ? "#28a745" : "#dc3545",
                boxShadow: relayStatus.relay1 ? "0 0 8px rgba(40, 167, 69, 0.5)" : "0 0 8px rgba(220, 53, 69, 0.5)",
              }}
              className={`relay-status-button-relay ${relayStatus.relay1 ? "relay-online-relay" : "relay-offline-relay"}`}
              title={`Relay 1 ${relayStatus.relay1 ? "ON" : "OFF"}`}
            >
              {relayStatus.relay1 ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Relay 2 */}
        <div className="col-12 col-md-4">
          <div className="relay-status-block-relay">
            <div className="relay-description-relay">
              Zona:1 | Relay:2
            </div>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: relayStatus.relay2 ? "#28a745" : "#dc3545",
                boxShadow: relayStatus.relay2 ? "0 0 8px rgba(40, 167, 69, 0.5)" : "0 0 8px rgba(220, 53, 69, 0.5)",
              }}
              className={`relay-status-button-relay ${relayStatus.relay2 ? "relay-online-relay" : "relay-offline-relay"}`}
              title={`Relay 2 ${relayStatus.relay2 ? "ON" : "OFF"}`}
            >
              {relayStatus.relay2 ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Relay 3 */}
        <div className="col-12 col-md-4">
          <div className="relay-status-block-relay">
            <div className="relay-description-relay">
              Zona:1 | Relay:3
            </div>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: relayStatus.relay3 ? "#28a745" : "#dc3545",
                boxShadow: relayStatus.relay3 ? "0 0 8px rgba(40, 167, 69, 0.5)" : "0 0 8px rgba(220, 53, 69, 0.5)",
              }}
              className={`relay-status-button-relay ${relayStatus.relay3 ? "relay-online-relay" : "relay-offline-relay"}`}
              title={`Relay 3 ${relayStatus.relay3 ? "ON" : "OFF"}`}
            >
              {relayStatus.relay3 ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .relay-container {
          padding: 20px;
          border-radius: 8px;
        }

        .relay-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 20px;
          color: #FFD700;
        }

        .relay-row {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: space-around;
        }

        .col-12 {
          width: 100%;
        }

        .col-md-4 {
          width: 32%;
        }

        .relay-status-block-relay {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #2B2B2B;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        .relay-description-relay {
          font-size: 1.2rem;
          font-weight: 500;
          color: #FFD700;
          margin-bottom: 10px;
        }

        .relay-status-button-relay {
          width: 100%;
          font-size: 1.2em;
          padding: 10px 20px;
          cursor: pointer;
          border: none;
          border-radius: 50px;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .relay-status-button-relay.relay-online-relay {
          background-color: #28a745;
          box-shadow: 0 0 8px rgba(40, 167, 69, 0.5);
        }

        .relay-status-button-relay.relay-offline-relay {
          background-color: #dc3545;
          box-shadow: 0 0 8px rgba(220, 53, 69, 0.5);
        }

        /* Стили для мобильных устройств */
        @media (max-width: 576px) {
          .col-12 {
            width: 100%;
          }

          .col-md-4 {
            width: 100%;
          }

          .relay-status-button-relay {
            font-size: 1em;
            padding: 8px 16px;
          }
        }
      `}</style>
    </div>
  );
}
