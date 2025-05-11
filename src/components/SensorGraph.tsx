"use client";

import { useEffect, useState } from "react";
import _ from "lodash";

interface SensorDataPoint {
  sensor_id: string;
  temperature: number;
  humidity: number;
  timestamp: number | string;
}

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
    const parsed = new Date(Number(ts));
    if (!isNaN(parsed.getTime())) return parsed;
  } catch {}
  return new Date();
};

const fillMissingIntervals = (data: DataPoint[], periodMins: number): DataPoint[] => {
  const msStep = 5 * 60 * 1000;
  const now = Date.now();
  const end = Math.floor(now / msStep) * msStep;
  const start = end - periodMins * 60 * 1000;

  const pointsBySlot = new Map<number, DataPoint>();
  data.forEach((d) => {
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
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[1]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/sensor-records", { cache: "no-store" });
      const json = await res.json();
      setSensorData(Array.isArray(json) ? json : []);
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
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
    const end = selectedPeriod.minutes === 1440 ? new Date().setHours(23, 59, 59, 999) : now;
    const start = end - selectedPeriod.minutes * 60 * 1000;
    return arr.filter((d) => d.timestamp >= start && d.timestamp <= end);
  };

  const chartHeight = 300;
  const stepX = 60;
  const maxTemp = 50;
  const normTempY = (t: number) => chartHeight - (t / maxTemp) * chartHeight;

  const sensorGraphs: Record<string, DataPoint[]> = {};
  SENSOR_OPTIONS.forEach(sensorId => {
    const exists = sensorData.some(d => d.sensor_id === sensorId);
    if (!exists) return;
    const formatted = formatSensorData(sensorData.filter(d => d.sensor_id === sensorId));
    const zoomed = fillMissingIntervals(filterByZoom(formatted), selectedPeriod.minutes);
    if (zoomed.length > 0) sensorGraphs[sensorId] = zoomed;
  });

  const width = sensorGraphs[Object.keys(sensorGraphs)[0]]?.length * stepX || 1000;

  return (
    <div className="p-3 text-white" style={{ background: "#222" }}>
      <h5 className="text-warning">Графік температури для активних сенсорів</h5>
      <div className="d-flex gap-3 align-items-center mb-3">
        <select className="form-select w-auto" value={selectedPeriod.label} onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find(p => p.label === e.target.value) || PERIOD_OPTIONS[0])}>
          {PERIOD_OPTIONS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
        </select>
      </div>

      <div className="mb-2 d-flex gap-3 flex-wrap">
        {Object.keys(sensorGraphs).map((id) => (
          <span key={id} className="d-flex align-items-center gap-2">
            <span style={{ width: 12, height: 12, backgroundColor: SENSOR_COLORS[id], display: "inline-block" }}></span>
            <span>{id}</span>
          </span>
        ))}
      </div>

      {viewMode === "chart" && (
        <div style={{ overflowX: "auto" }}>
          <svg width={width} height={chartHeight + 40}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              return <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="#333" strokeDasharray="2,2" />;
            })}
            {Object.entries(sensorGraphs).map(([sensorId, data]) => (
              <path
                key={sensorId}
                d={data.map((d, i) => isNaN(d.temp) ? "" : `${i === 0 ? "M" : "L"} ${i * stepX},${normTempY(d.temp)}`).join(" ")}
                stroke={SENSOR_COLORS[sensorId]}
                fill="none"
                strokeWidth={2}
              />
            ))}
            {Object.entries(sensorGraphs)[0]?.[1]?.map((d, i) => (
              <text key={i} x={i * stepX} y={chartHeight + 35} fontSize={10} textAnchor="middle" fill="#aaa">{d.time}</text>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
