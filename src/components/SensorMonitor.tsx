"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";

type RawSensorItem = {
  id: string;
  temperature: number | string;
  timestamp: number;
};

type RawSensorResponse = {
  [sensorKey: string]: RawSensorItem;
};

type SensorData = {
  id: string;
  temp: string;
  online: boolean;
};

const SENSOR_KEYS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];

export function SensorMonitor() {
  const [sensors, setSensors] = useState<SensorData[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/sensors", { cache: "no-store" });
        const data: RawSensorResponse = await res.json();

        const sensorList: SensorData[] = SENSOR_KEYS.map((key) => {
          const value = data[key];
          const timestamp = value?.timestamp;
          const online =
            typeof timestamp === "number" &&
            Math.abs(Date.now() - timestamp) < 60000;
        
          console.log("Sensor:", key, "Temp:", value?.temperature, "Timestamp:", timestamp, "Online:", online);
        
          return {
            id: key,
            temp: value?.temperature?.toString() || "--",
            online,
          };
        });
        

        setSensors(sensorList);
      } catch (error) {
        console.error("Ошибка получения:", error);
        setSensors(
          SENSOR_KEYS.map((key) => ({
            id: key,
            temp: "--",
            online: false,
          }))
        );
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const averageTemp = sensors.length
    ? (
        sensors.reduce((acc, s) => acc + parseFloat(s.temp || "0"), 0) / sensors.length
      ).toFixed(2)
    : "--";

  return (
    <div className="container sensor-container p-4">
      <h2 className="text-center mb-1">Средние показания:</h2>
      <div className="row">
        <div className="col-12 col-md-6 pb-2">
          <div className="top-average-temp-block">
            <div className="top-average-temp-label">
              <FontAwesomeIcon icon={faThermometerHalf} />{" "}
              <span id="averageTemperature" className="top-average-temp-data">
                {averageTemp} °C
              </span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-center mt-4 mb-1">Моніторинг датчиків температури:</h2>
      <div className="row">
        {sensors.map((sensor, index) => (
          <div key={index} className="col-6 col-md-3">
            <div className="average-temp-block">
              <div className="description-temp-block">
                {sensor.id}
                <button
                  className={`status-button ${sensor.online ? "online" : "offline"}`}
                  title={`Sensor ${sensor.online ? "Online" : "Offline"}`}
                >
                  ● {sensor.online ? "ONLINE" : "OFFLINE"}
                </button>
              </div>
              <div className="average-temp-label">
                <FontAwesomeIcon icon={faThermometerHalf} />{" "}
                <span className="average-temp-data">{sensor.temp} °C</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
