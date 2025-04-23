"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThermometerHalf,
  faTint,
  faTemperatureLow,
  faWater,
} from "@fortawesome/free-solid-svg-icons";

export default function ZonaAverageBlock() {
  const [airTemp, setAirTemp] = useState<string>("--");
  const [soilTemp, setSoilTemp] = useState<string>("--");
  const [airHumidity, setAirHumidity] = useState<string>("--");
  const [soilHumidity, setSoilHumidity] = useState<string>("--");

  useEffect(() => {
    const fetchAverages = async () => {
      try {
        const tempRes = await fetch("/api/sensors", { cache: "no-store" });
        const tempData = await tempRes.json();
        const tempSensors = tempData.sensors;

        const airTemps = ["SENSOR1-1", "SENSOR1-2"]
          .map((key) => parseFloat(tempSensors?.[key]?.temperature))
          .filter((v) => !isNaN(v));
        const soilTemps = ["SENSOR1-3", "SENSOR1-4"]
          .map((key) => parseFloat(tempSensors?.[key]?.temperature))
          .filter((v) => !isNaN(v));

        if (airTemps.length)
          setAirTemp((airTemps.reduce((a, b) => a + b, 0) / airTemps.length).toFixed(2) + " °C");
        if (soilTemps.length)
          setSoilTemp((soilTemps.reduce((a, b) => a + b, 0) / soilTemps.length).toFixed(2) + " °C");

        const humRes = await fetch("/api/humidity", { cache: "no-store" });
        const humData = await humRes.json();
        const humSensors = humData.sensors;

        const airHums = ["HUM1-1", "HUM1-2"]
          .map((key) => parseFloat(humSensors?.[key]?.humidity))
          .filter((v) => !isNaN(v));
        const soilHums = ["HUM1-3", "HUM1-4"]
          .map((key) => parseFloat(humSensors?.[key]?.humidity))
          .filter((v) => !isNaN(v));

        if (airHums.length)
          setAirHumidity((airHums.reduce((a, b) => a + b, 0) / airHums.length).toFixed(2) + " %");
        if (soilHums.length)
          setSoilHumidity((soilHums.reduce((a, b) => a + b, 0) / soilHums.length).toFixed(2) + " %");
      } catch (e) {
        console.error("Ошибка при получении середніх значень", e);
      }
    };

    fetchAverages();
    const interval = setInterval(fetchAverages, 5000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      id: "ПОВІТРЯ",
      icon: faThermometerHalf,
      value: airTemp,
    },
    {
      id: "ГРУНТУ",
      icon: faTemperatureLow,
      value: soilTemp,
    },
    {
      id: "ПОВІТРЯ",
      icon: faTint,
      value: airHumidity,
    },
    {
      id: "ГРУНТУ",
      icon: faWater,
      value: soilHumidity,
    },
  ];

  return (
    <div className="container zona-stats-container p-4">
      <h2 className="text-center mt-4 mb-1">Середні значення:</h2>
      <div className="row">
        {cards.map((card, index) => (
          <div key={index} className="col-6 col-md-3">
            <div className="zona-stats-card text-white text-center p-3 mb-4 rounded-4">
              <div className="zona-stats-label mb-2">
                <FontAwesomeIcon
                  icon={card.icon}
                  className="zona-stats-icon me-2"
                  style={{ color: "#FFD700" }}
                />
                <span className="zona-stats-title">{card.id}</span>
              </div>
              <div className="zona-stats-value fs-4">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .zona-stats-container {
          background: transparent;
        }

        .zona-stats-card {
          background: transparent;
          // border: 1px solid rgba(255, 255, 255, 0.2);
          transition: background 0.3s, transform 0.3s;
        }

        .zona-stats-card:hover {
          // background: rgba(255, 255, 255, 0.05);
          transform: translateY(-3px);
        }

        .zona-stats-label {
          font-weight: 600;
          font-size: 1rem;
        }

        .zona-stats-value {
          font-size: 1.4rem;
          font-weight: 600;
        }

        .zona-stats-icon {
          font-size: 1.4rem;
        }

        .zona-stats-title {
          vertical-align: middle;
        }
      `}</style>
    </div>
  );
}
