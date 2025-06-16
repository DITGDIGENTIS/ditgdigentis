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

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const company_name = window.location.pathname.split("/")[1];

      const response = await fetch(
        `/api/humidity-readings/last-one/${company_name}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch humidity status");
      }

      const data = await response.json();
      console.log("Received humidity data:", data);

      if (data && data.length > 0) {
        const reading = data[0];
        setLastReading(reading);
        setLastUpdate(new Date(reading.timestamp));
      }
    } catch (error) {
      console.error("Error fetching humidity status:", error);
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
              <button
                className={`status-button ${
                  lastReading ? "online" : "offline"
                }`}
              >
                ● {lastReading ? "ONLINE" : "OFFLINE"}
              </button>
            </div>
            <div className="average-temp-label d-flex justify-content-between gap-3 text-yellow">
              <div>
                <FontAwesomeIcon icon={faTint} />{" "}
                <span
                  className="average-temp-data fw-bold"
                  style={{
                    fontSize: "1.6rem",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  {lastReading ? `${lastReading.humidity}%` : "--"}
                </span>
              </div>
              <div>
                <FontAwesomeIcon icon={faTemperatureLow} />{" "}
                <span
                  className="average-temp-data fw-bold"
                  style={{
                    fontSize: "1.6rem",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  {lastReading ? `${lastReading.temperature}°C` : "--"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
