"use client";

import React, { useEffect, useState, CSSProperties } from "react";

type RelayKey = "relay1" | "relay2" | "relay3";

export default function ZonaRelay() {
  const [relayStatus, setRelayStatus] = useState<Record<RelayKey, boolean>>({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  const [pending, setPending] = useState<Record<RelayKey, boolean>>({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  const fetchStatus = async () => {
    try {
      const res = await fetch("https://ditgdigentis.vercel.app/api/status/relay?id=zona1", {
        cache: "no-store",
      });
      const data = await res.json();
      const relayState = data?.relayState;

      if (relayState) {
        setRelayStatus({
          relay1: relayState.relay1 === 1,
          relay2: relayState.relay2 === 1,
          relay3: relayState.relay3 === 1,
        });
        // Обнуляем pending, когда получили обновлённое состояние от Pi
        setPending({
          relay1: false,
          relay2: false,
          relay3: false,
        });
      }
    } catch (err) {
      console.error("Ошибка получения статуса:", err);
    }
  };

  const toggleRelay = async (relay: RelayKey, action: number) => {
    try {
      setPending((prev) => ({ ...prev, [relay]: true }));
      const res = await fetch("https://ditgdigentis.vercel.app/api/status/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "zona1", relay, action }),
      });

      const data = await res.json();
      if (!data.success) {
        setPending((prev) => ({ ...prev, [relay]: false }));
      }
    } catch (err) {
      console.error("Ошибка отправки команды:", err);
      setPending((prev) => ({ ...prev, [relay]: false }));
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000); // <--- обновление каждую секунду
    return () => clearInterval(interval);
  }, []);

  const relays: RelayKey[] = ["relay1", "relay2", "relay3"];

  return (
    <div className="container">
      <h2 className="relay-title text-center mt-4 mb-4">
        Мониторинг реле (Зона:1)
      </h2>
      <div className="row">
        {relays.map((relay) => {
          const isOn = relayStatus[relay];
          const isPending = pending[relay];

          return (
            <div key={relay} className="col-6 col-md-4">
              <div className="relay-status-block-relay">
                <div className="relay-description-relay">
                  Zona:1 | {relay.toUpperCase()}
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
                  {isPending ? "Ожидание..." : isOn ? "ON" : "OFF"}
                </button>

                <button
                  style={{
                    ...buttonStyle,
                    marginTop: "10px",
                    backgroundColor: "#007bff",
                  }}
                  onClick={() => toggleRelay(relay, isOn ? 0 : 1)}
                  title={`Переключить ${relay.toUpperCase()}`}
                  disabled={isPending}
                >
                  {isPending
                    ? "Изменяем..."
                    : isOn
                    ? "Выключить"
                    : "Включить"}
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
