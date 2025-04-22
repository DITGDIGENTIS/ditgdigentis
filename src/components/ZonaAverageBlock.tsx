"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf, faTint } from "@fortawesome/free-solid-svg-icons";

export default function ZonaAverageBlock() {
  const [averageTemp, setAverageTemp] = useState<string>("--");
  const [averageHumidity, setAverageHumidity] = useState<string>("--");

  useEffect(() => {
    const fetchAverages = async () => {
      try {
        // Температура
        const tempRes = await fetch("/api/sensors", { cache: "no-store" });
        const tempData = await tempRes.json();
        const tempSensors = tempData.sensors;

        const temps = ["SENSOR1-1", "SENSOR1-2"]
          .map((key) => parseFloat(tempSensors?.[key]?.temperature))
          .filter((v) => !isNaN(v));

        if (temps.length) {
          const avg = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2);
          setAverageTemp(`${avg} °C`);
        }

        // Влажность
        const humRes = await fetch("/api/humidity", { cache: "no-store" });
        const humData = await humRes.json();
        const humSensors = humData.sensors;

        const hums = ["HUM1-1", "HUM1-2"]
          .map((key) => parseFloat(humSensors?.[key]?.humidity))
          .filter((v) => !isNaN(v));

        if (hums.length) {
          const avg = (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(2);
          setAverageHumidity(`${avg} %`);
        }
      } catch (e) {
        console.error("Ошибка при получении средних значений", e);
      }
    };

    fetchAverages();
    const interval = setInterval(fetchAverages, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="zona-average-block text-center p-3 border rounded shadow-sm mb-4">
      <h5 className="mb-3">Середні показники</h5>

      <div className="fs-4 mb-2">
        <FontAwesomeIcon icon={faThermometerHalf} className="me-2" />
        <span className="top-average-temp-data">{averageTemp}</span>
      </div>

      <div className="fs-4">
        <FontAwesomeIcon icon={faTint} className="me-2" />
        <span className="top-average-temp-data">{averageHumidity}</span>
      </div>
    </div>
  );
}
