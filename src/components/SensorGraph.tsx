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

const SENSOR_OPTIONS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const PERIOD_OPTIONS = [
  { label: "15 хв", minutes: 15 },
  { label: "1 година", minutes: 60 },
  { label: "1 день", minutes: 1440 },
];

const SENSOR_COLORS: Record<string, string> = {
  "SENSOR1-1": "#00ffff",
  "SENSOR1-2": "#ffcc00",
  "SENSOR1-3": "#ff44aa",
  "SENSOR1-4": "#88ff00",
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

const fillMissingIntervals = (data: DataPoint[], periodMins: number): DataPoint[] => {
  if (data.length === 0) return [];
  const msStep = 5 * 60 * 1000;
  const end = data[data.length - 1].timestamp;
  const start = end - periodMins * 60 * 1000;

  const pointsBySlot = new Map<number, DataPoint>();
  data.forEach(d => {
    const rounded = Math.floor(d.timestamp / msStep) * msStep;
    pointsBySlot.set(rounded, d);
  });

  const result: DataPoint[] = [];
  for (let t = start; t <= end; t += msStep) {
    if (pointsBySlot.has(t)) {
      result.push(pointsBySlot.get(t)!);
    } else {
      const date = new Date(t);
      result.push({
        timestamp: t,
        temp: NaN,
        hum: NaN,
        time: date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", hour12: false }),
        date: date.toLocaleDateString("uk-UA"),
      });
    }
  }
  return result;
};

export default function SensorGraphDS18B20() {
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedSensors, setSelectedSensors] = useState<string[]>(["SENSOR1-1"]);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/sensor-readings");
        if (!response.ok) throw new Error("Failed to fetch");
        const readings = await response.json();
        if (Array.isArray(readings)) {
          setSensorData(readings);
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error(err);
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
          time: date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", hour12: false }),
          temp: reading.temperature,
          hum: reading.humidity ?? 0,
          date: date.toLocaleDateString("uk-UA"),
          timestamp: date.getTime(),
        };
      }),
      ["timestamp"],
      ["asc"]
    );

  const filterByZoom = (arr: DataPoint[]) => {
    const now = Date.now();
    const rangeEnd = selectedPeriod.minutes === 1440 ? new Date().setHours(23, 59, 59, 999) : now;
    const rangeStart = rangeEnd - selectedPeriod.minutes * 60 * 1000;
    return arr.filter(d => d.timestamp >= rangeStart && d.timestamp <= rangeEnd);
  };

  const chartHeight = 300;
  const stepX = 60;
  const maxTemp = 50;
  const normTempY = (t: number) => chartHeight - (t / maxTemp) * chartHeight;

  const sensorGraphs: Record<string, DataPoint[]> = {};
  selectedSensors.forEach(sensorId => {
    const filtered = sensorData.filter(d => d.sensor_id === sensorId);
    const formatted = formatSensorData(filtered);
    const zoomed = fillMissingIntervals(filterByZoom(formatted), selectedPeriod.minutes);
    if (zoomed.length > 0) sensorGraphs[sensorId] = zoomed;
  });

  const width = Object.values(sensorGraphs)[0]?.length * stepX || 1000;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: "5px" }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
        <h5 className="text-warning mb-0">Графік температури</h5>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <select className="form-select" value={selectedPeriod.label} onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find(p => p.label === e.target.value) || PERIOD_OPTIONS[0])}>
            {PERIOD_OPTIONS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
          {SENSOR_OPTIONS.map((s) => (
            <label key={s} className="form-check-label">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedSensors.includes(s)}
                onChange={() =>
                  setSelectedSensors((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                  )
                }
              />
              {s}
            </label>
          ))}
          <div className="btn-group">
            <button className={`btn btn-sm ${viewMode === 'chart' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setViewMode("chart")}>Графік</button>
            <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setViewMode("table")}>Таблиця</button>
          </div>
        </div>
      </div>

      <div className="text-warning mb-3">Останнє оновлення: {lastUpdate.toLocaleTimeString()}</div>

      {Object.keys(sensorGraphs).length === 0 ? (
        <div className="text-center text-muted my-5">⛔ Немає даних для цього періоду</div>
      ) : viewMode === "chart" ? (
        <div style={{ overflowX: "auto", borderRadius: "5px" }}>
          <svg width={width} height={chartHeight + 60}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              return <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="#444" />;
            })}
            {Object.entries(sensorGraphs).map(([sensorId, data]) => (
              <path
                key={sensorId}
                d={data.map((d, i) => isNaN(d.temp) ? "" : `${i === 0 ? "M" : "L"} ${i * stepX},${normTempY(d.temp)}`).join(" ")}
                stroke={SENSOR_COLORS[sensorId] || "#fff"}
                fill="none"
                strokeWidth={2}
              />
            ))}
            {Object.entries(sensorGraphs)[0]?.[1]?.map((d, i) => (
              <text key={i} x={i * stepX} y={chartHeight + 55} fontSize={12} textAnchor="middle" fill="#999">{d.time}</text>
            ))}
          </svg>
        </div>
      ) : (
        <div className="table-responsive mt-3" style={{ maxHeight: selectedPeriod.minutes === 1440 ? 'none' : '300px', overflowY: selectedPeriod.minutes === 1440 ? 'visible' : 'auto' }}>
          <table className="table table-sm table-dark table-bordered text-center">
            <thead>
              <tr>
                <th>Сенсор</th>
                <th>Час</th>
                <th>Температура (°C)</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sensorGraphs).flatMap(([sensorId, data]) =>
                _.orderBy(data, ['timestamp'], ['desc']).map((d, i) => (
                  <tr key={`${sensorId}-${i}`} className={i === 0 ? 'table-primary' : ''}>
                    <td style={{ color: SENSOR_COLORS[sensorId] }}>{sensorId}</td>
                    <td>{d.time}</td>
                    <td>{isNaN(d.temp) ? '--' : d.temp.toFixed(1)}</td>
                    <td>{d.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
