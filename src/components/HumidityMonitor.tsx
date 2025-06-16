"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faTemperatureLow } from "@fortawesome/free-solid-svg-icons";
import * as _ from "lodash";

interface HumidityReading {
  humidity: number | null;
  temperature: number | null;
  timestamp: string;
}

export function HumidityMonitor() {
  const [lastReading, setLastReading] = useState<HumidityReading | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(true);

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchStatus = async () => {
    try {
      const company_name = window.location.pathname.split("/")[1];

      const response = await fetch(
        `/api/humidity-readings/last-one/${company_name}`
      );
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      if (data && data.length > 0) {
        const reading = data[0];
        const ts = new Date(reading.timestamp);

        if (reading.humidity !== null || reading.temperature !== null) {
          setLastReading(reading);
          setIsOffline(false);
        } else {
          setLastReading(null);
          setIsOffline(true);
        }
      } else {
        setLastReading(null);
        setIsOffline(true);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
      setIsOffline(true);
      setLastReading(null);
    }
  };

  return (
    <div className="container sensor-container">
      <h2 className="text-center mt-4 mb-1">Моніторинг HUM1-1</h2>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8">
          <div className="average-temp-block p-3 rounded shadow-sm">
            <div className="description-temp-block d-flex justify-content-between mb-2">
              <strong>HUM1-1</strong>
              <button className={`status-button ${isOffline ? "offline" : "online"}`}>
                ● {isOffline ? "OFFLINE" : "ONLINE"}
              </button>
            </div>
            {isOffline ? (
              <div className="text-center text-danger fw-bold" style={{ fontSize: "1.2rem" }}>
                Датчик не в мережі
              </div>
            ) : (
              <div className="average-temp-label d-flex justify-content-between gap-3 text-yellow">
                <div>
                  <FontAwesomeIcon icon={faTint} />{" "}
                  <span className="average-temp-data fw-bold" style={{ fontSize: "1.6rem", color: "#fff" }}>
                    {lastReading?.humidity !== null ? `${lastReading?.humidity}%` : "N/A"}
                  </span>
                </div>
                <div>
                  <FontAwesomeIcon icon={faTemperatureLow} />{" "}
                  <span className="average-temp-data fw-bold" style={{ fontSize: "1.6rem", color: "#fff" }}>
                    {lastReading?.temperature !== null ? `${lastReading?.temperature}°C` : "N/A"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
