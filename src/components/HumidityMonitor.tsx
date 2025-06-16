"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTint, faTemperatureLow } from "@fortawesome/free-solid-svg-icons";

interface HumidityReading {
  humidity: number;
  temperature: number;
  timestamp: string;
}

export function HumidityMonitor() {
  const [lastReading, setLastReading] = useState<HumidityReading | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
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
        const now = new Date();
        const ts = new Date(reading.timestamp);
        const ageMs = now.getTime() - ts.getTime();

        if (ageMs < 5 * 60 * 1000) {
          setLastReading(reading);
          setLastUpdate(ts);
          setIsOffline(false);
        } else {
          setLastReading(null);
          setLastUpdate(null);
          setIsOffline(true);
        }
      } else {
        setLastReading(null);
        setLastUpdate(null);
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
                    {lastReading?.humidity}%
                  </span>
                </div>
                <div>
                  <FontAwesomeIcon icon={faTemperatureLow} />{" "}
                  <span className="average-temp-data fw-bold" style={{ fontSize: "1.6rem", color: "#fff" }}>
                    {lastReading?.temperature}°C
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
