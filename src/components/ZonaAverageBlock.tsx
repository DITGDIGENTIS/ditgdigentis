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
        console.error("Ошибка при получении средніх значень", e);
      }
    };

    fetchAverages();
    const interval = setInterval(fetchAverages, 5000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      id: "ТЕМП | ПОВІТРЯ",
      icon: faThermometerHalf,
      value: airTemp,
    },
    {
      id: "ТЕМП | ГРУНТУ",
      icon: faTemperatureLow,
      value: soilTemp,
    },
    {
      id: "ВОЛОГІСТЬ | ПОВІТРЯ",
      icon: faTint,
      value: airHumidity,
    },
    {
      id: "ВОЛОГІСТЬ | ГРУНТУ",
      icon: faWater,
      value: soilHumidity,
    },
  ];

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mt-4 mb-1">Середні значення:</h2>
      <div className="row">
        {cards.map((card, index) => (
          <div key={index} className="col-6 col-md-3">
            <div className="average-temp-block text-white bg-dark p-3 mb-4 rounded-4 shadow-lg text-center">
              <div className="description-temp-block mb-2">
                <FontAwesomeIcon icon={card.icon} style={{ color: "#FFD700" }} className="me-2" />
                <strong>{card.id}</strong>
              </div>
              <div className="average-temp-label fs-4">
                <span className="average-temp-data">{card.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
