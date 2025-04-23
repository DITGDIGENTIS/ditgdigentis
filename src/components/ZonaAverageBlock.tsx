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
        // Температура
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
          setAirTemp(
            (airTemps.reduce((a, b) => a + b, 0) / airTemps.length).toFixed(2) + " °C"
          );
        if (soilTemps.length)
          setSoilTemp(
            (soilTemps.reduce((a, b) => a + b, 0) / soilTemps.length).toFixed(2) + " °C"
          );

        // Влажность
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
          setAirHumidity(
            (airHums.reduce((a, b) => a + b, 0) / airHums.length).toFixed(2) + " %"
          );
        if (soilHums.length)
          setSoilHumidity(
            (soilHums.reduce((a, b) => a + b, 0) / soilHums.length).toFixed(2) + " %"
          );
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
      <h2 className="text-center mt-4 mb-4">Середні показники</h2>

      <div className="row row-cols-2 row-cols-md-4 g-3">
        <div className="col">
          <div className="p-3 border rounded">
            <FontAwesomeIcon icon={faThermometerHalf} className="me-2" />
            <strong>Темп. повітря</strong>
            <div className="fs-5 mt-2">{airTemp}</div>
          </div>
        </div>

        <div className="col">
          <div className="p-3 border rounded">
            <FontAwesomeIcon icon={faTemperatureLow} className="me-2" />
            <strong>Темп. ґрунту</strong>
            <div className="fs-5 mt-2">{soilTemp}</div>
          </div>
        </div>

        <div className="col">
          <div className="p-3 border rounded">
            <FontAwesomeIcon icon={faTint} className="me-2" />
            <strong>Вологість повітря</strong>
            <div className="fs-5 mt-2">{airHumidity}</div>
          </div>
        </div>

        <div className="col">
          <div className="p-3 border rounded">
            <FontAwesomeIcon icon={faWater} className="me-2" />
            <strong>Вологість ґрунту</strong>
            <div className="fs-5 mt-2">{soilHumidity}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
