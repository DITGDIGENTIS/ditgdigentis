"use client";

import { useState, useEffect } from "react";
import _ from "lodash";
import { SensorDataPoint } from "../services/sensor-data.service";

interface DataPoint {
  time: string;
  temp: number;
  hum: number;
  date: string;
  timestamp: number;
}

type SensorGraphDS18B20Props = {
  sensorId: string;
};

const safeParseDate = (ts: any): Date => {
  try {
    if (ts instanceof Date) return ts;
    if (typeof ts === "string" || typeof ts === "number") {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {}
  return new Date();
};

const SENSOR_OPTIONS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const PERIOD_OPTIONS = [
  { label: "15 хв", minutes: 15 },
  { label: "1 година", minutes: 60 },
  { label: "1 день", minutes: 1440 },
];

const SensorGraphDS18B20 = ({ sensorId }: SensorGraphDS18B20Props) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedSensor, setSelectedSensor] = useState<string>("SENSOR1-1");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/sensor-readings");
        if (!response.ok) throw new Error("Failed to fetch sensor data");
        const readings = await response.json();
        if (!Array.isArray(readings)) return;
        setSensorData(readings);
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Component: Error fetching sensor data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatSensorData = (data: SensorDataPoint[]): DataPoint[] =>
    _.orderBy(
      data.map((reading) => {
        const date = safeParseDate(reading.timestamp);
        return {
          time: date.toLocaleTimeString("uk-UA", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          temp: reading.temperature,
          hum: reading.humidity ?? 0,
          date: date.toLocaleDateString("uk-UA"),
          timestamp: date.getTime(),
        };
      }),
      ["timestamp"],
      ["desc"]
    );

  const filterBy5MinInterval = (arr: DataPoint[]): DataPoint[] => {
    const roundedMap = new Map<number, DataPoint>();
    arr.forEach((d) => {
      const rounded = Math.floor(d.timestamp / 300000) * 300000;
      if (!roundedMap.has(rounded)) {
        roundedMap.set(rounded, d);
      }
    });
    return _.orderBy(Array.from(roundedMap.values()), ["timestamp"], ["asc"]);
  };

  const filterByZoom = (arr: DataPoint[]) => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const rangeEnd = selectedPeriod.minutes === 1440
      ? dayEnd
      : new Date(Date.now());

    const rangeStart = new Date(rangeEnd.getTime() - selectedPeriod.minutes * 60 * 1000);

    return _.orderBy(
      arr.filter((d) => d.timestamp >= rangeStart.getTime() && d.timestamp <= rangeEnd.getTime()),
      ["timestamp"],
      ["asc"]
    );
  };

  const chartHeight = 300;
  const stepX = 60;
  const maxTemp = 50;
  const normTempY = (t: number) => chartHeight - (t / maxTemp) * chartHeight;

  const sensorFiltered = filterBy5MinInterval(
    formatSensorData(sensorData.filter((d) => d.sensor_id === selectedSensor))
  );

  const zoomedSensor = filterByZoom(sensorFiltered);
  const width = zoomedSensor.length * stepX;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: "5px" }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
        <h5 className="text-warning mb-0">Температура {selectedSensor}</h5>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <select className="form-select" value={selectedSensor} onChange={(e) => setSelectedSensor(e.target.value)}>
            {SENSOR_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={selectedPeriod.label}
            onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find((p) => p.label === e.target.value) || PERIOD_OPTIONS[0])}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
          <div className="btn-group">
            <button className={`btn btn-sm ${viewMode === 'chart' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setViewMode("chart")}>Графік</button>
            <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setViewMode("table")}>Таблиця</button>
          </div>
        </div>
      </div>

      <div className="text-warning mb-3">Останнє оновлення: {lastUpdate.toLocaleTimeString()}</div>

      {zoomedSensor.length === 0 ? (
        <div className="text-center text-muted my-5">⛔ Немає даних для цього періоду</div>
      ) : viewMode === "chart" ? (
        <div style={{ overflowX: "auto", margin: "0", borderRadius: "5px" }}>
          <svg width={width} height={chartHeight + 60}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              return <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="#444" />;
            })}
            <path
              d={zoomedSensor.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX},${normTempY(d.temp)}`).join(" ")}
              stroke="#44c0ff"
              fill="none"
              strokeWidth={2}
            />
            {zoomedSensor.map((d, i) => (
              <g key={i}>
                <circle cx={i * stepX} cy={normTempY(d.temp)} r={4} fill="#00ffff" />
                <text x={i * stepX} y={normTempY(d.temp) - 10} fontSize={11} textAnchor="middle" fill="#ccc">
                  {d.temp.toFixed(1)}°
                </text>
                <text x={i * stepX} y={chartHeight + 55} fontSize={12} textAnchor="middle" fill="#999">
                  {d.time}
                </text>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div className="table-responsive mt-3" style={{ maxHeight: selectedPeriod.minutes === 1440 ? 'none' : '300px', overflowY: selectedPeriod.minutes === 1440 ? 'visible' : 'auto' }}>
          <table className="table table-sm table-dark table-bordered text-center">
            <thead>
              <tr>
                <th>Час</th>
                <th>Температура (°C)</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {_.orderBy(zoomedSensor, ['timestamp'], ['desc']).map((d, i) => (
                <tr key={i} className={i === 0 ? 'table-primary' : ''}>
                  <td>{d.time}</td>
                  <td>{d.temp.toFixed(1)}</td>
                  <td>{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SensorGraphDS18B20;
