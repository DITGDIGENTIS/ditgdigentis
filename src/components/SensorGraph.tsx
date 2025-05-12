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
  sensor_id: string;
}

type SensorGraphDS18B20Props = {
  sensorId: string;
};

const safeParseDate = (ts: any): Date => {
  try {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return new Date();
};

const SENSOR_OPTIONS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const PERIOD_OPTIONS = [
  { label: "15 хв", minutes: 15 },
  { label: "1 година", minutes: 60 },
  { label: "1 день", minutes: 1440 },
];

const COLORS = ["#44c0ff", "#ffa500", "#ff4444", "#66ff66"];

const SensorGraphDS18B20 = ({ sensorId }: SensorGraphDS18B20Props) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/sensor-readings");
        if (!response.ok) throw new Error("Failed to fetch sensor data");
        const readings = await response.json();
        setSensorData(readings);
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Error fetching:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatSensorData = (data: SensorDataPoint[]): DataPoint[] =>
    data.map((reading) => {
      const date = safeParseDate(reading.timestamp);
      return {
        time: date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit", hour12: false }),
        temp: reading.temperature,
        hum: reading.humidity ?? 0,
        date: date.toLocaleDateString("uk-UA"),
        timestamp: date.getTime(),
        sensor_id: reading.sensor_id,
      };
    });

  const filterBy5MinInterval = (arr: DataPoint[]): DataPoint[] => {
    const result: DataPoint[] = [];
    const seen = new Set<string>();
    arr.forEach((d) => {
      const rounded = `${d.sensor_id}-${Math.floor(d.timestamp / 300000) * 300000}`;
      if (!seen.has(rounded)) {
        seen.add(rounded);
        result.push(d);
      }
    });
    return _.orderBy(result, ["timestamp"], ["asc"]);
  };

  const filterByZoom = (arr: DataPoint[]) => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const rangeEnd = selectedPeriod.minutes === 1440 ? dayEnd : new Date();
    const rangeStart = new Date(rangeEnd.getTime() - selectedPeriod.minutes * 60 * 1000);
    return arr.filter((d) => d.timestamp >= rangeStart.getTime() && d.timestamp <= rangeEnd.getTime());
  };

  const chartHeight = 300;
  const stepX = 60;
  const maxTemp = 50;
  const normTempY = (t: number) => chartHeight - (t / maxTemp) * chartHeight;

  const formatted = filterByZoom(filterBy5MinInterval(formatSensorData(sensorData)));
  const groupedBySensor = _.groupBy(formatted, "sensor_id");
  const maxLength = Math.max(...Object.values(groupedBySensor).map((arr) => arr.length), 0);
  const width = maxLength * stepX;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: "5px" }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
        <h5 className="text-warning mb-0">Температура: всі сенсори</h5>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <input type="date" className="form-control" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
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

      {formatted.length === 0 ? (
        <div className="text-center text-muted my-5">⛔ Немає даних</div>
      ) : viewMode === "chart" ? (
        <div style={{ overflowX: "auto", borderRadius: "5px" }}>
          <svg width={width + 60} height={chartHeight + 60}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              const tempValue = maxTemp - (i * maxTemp) / 10;
              return (
                <g key={i}>
                  <line x1={40} y1={y} x2={width + 40} y2={y} stroke="#444" />
                  <text x={0} y={y + 4} fontSize={12} fill="#aaa">{tempValue.toFixed(0)}°</text>
                </g>
              );
            })}

            {SENSOR_OPTIONS.map((sensor, idx) => {
              const points = groupedBySensor[sensor];
              if (!points) return null;
              return (
                <g key={sensor}>
                  <path
                    d={points.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX + 40},${normTempY(d.temp)}`).join(" ")}
                    stroke={COLORS[idx % COLORS.length]}
                    fill="none"
                    strokeWidth={2}
                  />
                  {points.map((d, i) => (
                    <g key={i}>
                      <circle cx={i * stepX + 40} cy={normTempY(d.temp)} r={3} fill={COLORS[idx % COLORS.length]} />
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="table-responsive mt-3" style={{ maxHeight: selectedPeriod.minutes === 1440 ? 'none' : '300px', overflowY: selectedPeriod.minutes === 1440 ? 'visible' : 'auto' }}>
          <table className="table table-sm table-dark table-bordered text-center">
            <thead>
              <tr>
                <th>Сенсор</th>
                <th>Час</th>
                <th>Температура</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {_.orderBy(formatted, ['timestamp'], ['desc']).map((d, i) => (
                <tr key={i}>
                  <td>{d.sensor_id}</td>
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
