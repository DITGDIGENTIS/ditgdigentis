"use client";

import React, { useEffect, useState, CSSProperties } from "react";

/** Три реле, которые мы поддерживаем */
type RelayKey = "relay1" | "relay2" | "relay3";

export default function ZonaRelay() {
  // Текущее фактическое состояние (ON/OFF) для каждого реле
  const [relayStatus, setRelayStatus] = useState<Record<RelayKey, boolean>>({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  // Флаг для анимации мигания (блик) при смене состояния
  const [blinking, setBlinking] = useState<Record<RelayKey, boolean>>({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  // Флаг "pending" – когда пользователь нажал «Включить/Выключить»,
  // а мы ещё не получили подтверждение (PUT) от Pi.
  const [pending, setPending] = useState<Record<RelayKey, boolean>>({
    relay1: false,
    relay2: false,
    relay3: false,
  });

  /**
   * Отправляем команду на Vercel (POST), но НЕ меняем UI мгновенно.
   * Вместо этого помечаем relay как pending, чтобы кнопка показывала
   * "Ожидание..." или "Изменяем...", пока не придёт реальное подтверждение.
   */
  const toggleRelay = async (relay: RelayKey, action: number) => {
    try {
      // Ставим pending=true для конкретного реле
      setPending((prev) => ({ ...prev, [relay]: true }));

      const res = await fetch("https://ditgdigentis.vercel.app/api/status/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "zona1", relay, action }),
      });

      const data = await res.json();
      if (data.success) {
        // Запускаем анимацию "мигания" для визуального эффекта
        setBlinking((prev) => ({ ...prev, [relay]: true }));
        setTimeout(() => {
          setBlinking((prev) => ({ ...prev, [relay]: false }));
        }, 1800);

        // Подождём 2 сек, давая Pi время прочесть команду (GET) и переключить GPIO
        setTimeout(fetchStatus, 2000);
      } else {
        console.error("Ошибка ответа POST:", data);
        setPending((prev) => ({ ...prev, [relay]: false }));
      }
    } catch (error) {
      console.error("Ошибка отправки команды:", error);
      setPending((prev) => ({ ...prev, [relay]: false }));
    }
  };

  /**
   * Запрашиваем реальное состояние (GET) у Vercel,
   * которое Pi обновляет PUT'ом (relayState: { relay1:..., relay2:..., relay3:... }).
   * Если оно есть — показываем ON/OFF соответственно.
   */
  const fetchStatus = async () => {
    try {
      const url = "https://ditgdigentis.vercel.app/api/status/relay?id=zona1";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      // Если Pi отправила relayState
      const relayState = data?.relayState;
      if (relayState) {
        setRelayStatus({
          relay1: relayState.relay1 === 1,
          relay2: relayState.relay2 === 1,
          relay3: relayState.relay3 === 1,
        });
      }
      // Снимаем pending для всех, т.к. теперь мы получили новое состояние
      setPending({ relay1: false, relay2: false, relay3: false });
    } catch (err) {
      console.error("Ошибка получения статуса:", err);
    }
  };

  // При монтировании один раз вызываем fetchStatus,
  // затем каждые 5 сек (или 1–2 сек, если хотим более живой UI).
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // <-- Можно уменьшить до 1000-2000
    return () => clearInterval(interval);
  }, []);

  /** Массив наших реле */
  const relays: RelayKey[] = ["relay1", "relay2", "relay3"];

  return (
    <div className="container">
      <h2 className="relay-title text-center mt-4 mb-4">
        Мониторинг реле (Зона:1)
      </h2>

      <div className="row">
        {relays.map((relay) => {
          const isOn = relayStatus[relay];
          const isBlinking = blinking[relay];
          const isPending = pending[relay];

          return (
            <div key={relay} className="col-6 col-md-4">
              <div className="relay-status-block-relay">
                <div className="relay-description-relay">
                  Zona:1 | {relay.toUpperCase()}
                  <span
                    className={`relay-indicator ${isOn ? "on" : "off"} ${
                      isBlinking ? "blinking" : ""
                    }`}
                  />
                </div>

                {/* Кнопка статуса. Если pending=true, показываем "Ожидание...". */}
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
                  {isPending
                    ? "Ожидание..."
                    : isOn
                      ? "ON"
                      : "OFF"
                  }
                </button>

                {/* Кнопка включить/выключить */}
                <button
                  style={{ ...buttonStyle, marginTop: "10px", backgroundColor: "#007bff" }}
                  onClick={() => toggleRelay(relay, isOn ? 0 : 1)}
                  title={`Переключить ${relay.toUpperCase()}`}
                  disabled={isPending} // Блокируем, пока идёт переключение
                >
                  {isPending
                    ? "Изменяем..."
                    : isOn
                      ? "Выключить"
                      : "Включить"
                  }
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS */}
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

// Стили кнопки
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
