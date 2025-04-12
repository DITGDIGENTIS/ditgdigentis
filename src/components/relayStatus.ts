// components/RelayStatus.tsx
"use client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useEffect, useState } from "react";

type RelayStatusProps = {
  relay1: boolean;
  relay2: boolean;
  relay3: boolean;
};

export default function RelayStatus({ relay1, relay2, relay3 }: RelayStatusProps) {
  return (
    <div className="container">
      <h2 className="text-center mt-4 mb-1">Моніторинг реле:</h2>
      <div className="row">
        <div className="col-6 col-md-3">
          <div className="average-temp-block">
            <div className="description-temp-block">
              Zona:1 | Relay 1
              <button
                className={`status-button ${relay1 ? "online" : "offline"}`}
                title={`Relay 1 ${relay1 ? "ON" : "OFF"}`}
              >
                ● {relay1 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="average-temp-block">
            <div className="description-temp-block">
              Zona:1 | Relay 2
              <button
                className={`status-button ${relay2 ? "online" : "offline"}`}
                title={`Relay 2 ${relay2 ? "ON" : "OFF"}`}
              >
                ● {relay2 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="average-temp-block">
            <div className="description-temp-block">
              Zona:1 | Relay 3
              <button
                className={`status-button ${relay3 ? "online" : "offline"}`}
                title={`Relay 3 ${relay3 ? "ON" : "OFF"}`}
              >
                ● {relay3 ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
