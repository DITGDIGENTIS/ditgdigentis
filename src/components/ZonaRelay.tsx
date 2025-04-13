"use client";

import React, { useEffect, useState, CSSProperties } from "react";

const buttonStyle: CSSProperties = {
  padding: "10px 20px",
  fontSize: "1rem",
  fontWeight: "600",
  cursor: "pointer",
  color: "#fff",
  border: "none",
  borderRadius: "5px",
  textAlign: "center",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "115px",
  height: "27px",
  margin: "auto",
};

export default function ZonaRelay() {
  const relays = ["relay1", "relay2", "relay3"] as const;
  type RelayKey = typeof relays[number];

  const [relayStatus, setRelayStatus] = useState<Record<RelayKey, boolean>>({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  const [blinking, setBlinking] = useState<Record<RelayKey, boolean>>({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  const toggleRelay = async (relay: RelayKey, action: number) => {
    try {
      const res = await fetch("https://ditgdigentis.vercel.app/api/status/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "zona1", relay, action }),
      });

      const data = await res.json();
      if (data.success) {
        setRelayStatus((prev) => ({ ...prev, [relay]: action === 1 }));
        setBlinking((prev) => ({ ...prev, [relay]: true }));
        setTimeout(() => {
          setBlinking((prev) => ({ ...prev, [relay]: false }));
        }, 1800);
      }
    } catch (error) {
      console.error("Ошибка отправки команды:", error);
    }
  };

  useEffect(() => {
    const checkRemoteStatus = async () => {
      try {
        const res = await fetch("https://ditgdigentis.vercel.app/api/status", { cache: "no-store" });
        const data = await res.json();
        const zona = data?.zona1;
        if (zona) {
          setRelayStatus({
            relay1: zona.relay1 === 1,
            relay2: zona.relay2 === 1,
            relay3: zona.relay3 === 1,
          });
        }
      } catch {
        console.error("Ошибка получения статуса реле");
      }
    };

    checkRemoteStatus();
    const interval = setInterval(checkRemoteStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <h2 className="relay-title text-center mt-4 mb-4">Моніторинг реле:</h2>
      <div className="row">
        {relays.map((relay) => {
          const isOn = relayStatus[relay];
          const isBlinking = blinking[relay];

          return (
            <div key={relay} className="col-6 col-md-4">
              <div className="relay-status-block-relay">
                <div className="relay-description-relay">
                  Zona:1 | {relay.toUpperCase()}
                  <span className={`relay-indicator ${isOn ? "on" : "off"} ${isBlinking ? "blinking" : ""}`} />
                </div>

                <button
                  style={{
                    ...buttonStyle,
                    backgroundColor: isOn ? "#28a745" : "#dc3545",
                    boxShadow: isOn
                      ? "0 0 8px rgba(40, 167, 69, 0.5)"
                      : "0 0 8px rgba(220, 53, 69, 0.5)",
                  }}
                  title={`${relay.toUpperCase()} ${isOn ? "ON" : "OFF"}`}
                  className="relay-status-button-relay"
                >
                  {isOn ? "ON" : "OFF"}
                </button>

                <button
                  style={{ ...buttonStyle, marginTop: "10px", backgroundColor: "#007bff" }}
                  onClick={() => toggleRelay(relay, isOn ? 0 : 1)}
                  title={`Переключить ${relay.toUpperCase()}`}
                >
                  {isOn ? "Выключить" : "Включить"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .relay-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 20px;
          color: #fff;
        }

        .relay-status-block-relay {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #2B2B2B;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        }

        .relay-description-relay {
          color: #fff;
          margin-bottom: 10px;
          font-size: 1rem;
          font-weight: 600;
          text-align: center;
          position: relative;
        }

        .relay-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          margin-left: 10px;
          border-radius: 50%;
        }

        .relay-indicator.on {
          background-color: #28a745;
        }

        .relay-indicator.off {
          background-color: #dc3545;
        }

        .blinking {
          animation: blink 0.6s ease-in-out 0s 3;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .relay-status-button-relay {
          width: 100%;
          height: 20px;
          font-size: 1.2em;
          padding: 10px 20px;
          cursor: pointer;
          border: none;
          border-radius: 50px;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        @media (max-width: 576px) {
          .relay-status-button-relay {
            font-size: 1rem;
            padding: 8px 16px;
          }
        }
      `}</style>
    </div>
  );
}
