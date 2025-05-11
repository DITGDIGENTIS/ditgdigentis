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
  const [selectedSensors, setSelectedSensors] = useState<string[]>(["SENSOR1-1"]);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[1]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const downloadCSV = () => {
    const header = "Sensor,Time,Temperature,Humidity,Date";
    const rows = selectedSensors.flatMap(sensorId => {
      const filtered = sensorData.filter((d) => d.sensor_id === sensorId);
      const formatted = formatSensorData(filtered);
      const zoomed = fillMissingIntervals(filterByZoom(formatted), selectedPeriod.minutes);
      return zoomed.map((d) => `${sensorId},${d.time},${d.temp},${d.hum},${d.date}`);
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sensor_data.csv";
    a.click();
  };

  return (
    <div className="p-3 text-white" style={{ background: "#222" }}>
      <h5 className="text-warning">Графіки температури</h5>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <select className="form-select" value={selectedPeriod.label} onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find(p => p.label === e.target.value) || PERIOD_OPTIONS[0])}>
          {PERIOD_OPTIONS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
        </select>
        <div className="d-flex gap-2 flex-wrap">
          {SENSOR_OPTIONS.map((id) => (
            <label key={id} className="form-check-label">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedSensors.includes(id)}
                onChange={() => setSelectedSensors((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )}
              />
              {id}
            </label>
          ))}
        </div>
        <div className="btn-group ms-auto">
          <button className="btn btn-outline-light btn-sm" onClick={downloadCSV}>⬇ CSV</button>
          <button className={`btn btn-sm ${viewMode === 'chart' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setViewMode("chart")}>Графік</button>
          <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setViewMode("table")}>Таблиця</button>
        </div>
      </div>

      <div className="position-relative">
        {viewMode === "chart" && hoverIndex !== null && (
          <div className="position-absolute bg-secondary text-white px-2 py-1" style={{ top: 0, left: hoverIndex * stepX }}>
            {selectedSensors.map(sensorId => {
              const filtered = sensorData.filter((d) => d.sensor_id === sensorId);
              const formatted = formatSensorData(filtered);
              const zoomed = fillMissingIntervals(filterByZoom(formatted), selectedPeriod.minutes);
              const point = zoomed[hoverIndex];
              return <div key={sensorId}>{sensorId}: {point?.temp?.toFixed(1) ?? '--'}°C</div>;
            })}
          </div>
        )}
      </div>

      <div>
        {selectedSensors.map((sensorId) => {
          const filtered = sensorData.filter((d) => d.sensor_id === sensorId);
          const formatted = formatSensorData(filtered);
          const zoomed = fillMissingIntervals(filterByZoom(formatted), selectedPeriod.minutes);
          const width = zoomed.length * stepX;

          return (
            <div key={sensorId} className="mb-5">
              <h6 className="text-info">{sensorId}</h6>
              {viewMode === "chart" ? (
                <div style={{ overflowX: "auto" }}>
                  <svg width={width} height={chartHeight + 40}>
                    <path
                      d={zoomed.map((d, i) => isNaN(d.temp) ? "" : `${i === 0 ? "M" : "L"} ${i * stepX},${normTempY(d.temp)}`).join(" ")}
                      stroke="#00ffff"
                      fill="none"
                      strokeWidth={2}
                    />
                    {zoomed.map((d, i) => (
                      <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                        {!isNaN(d.temp) && <circle cx={i * stepX} cy={normTempY(d.temp)} r={3} fill="#00ffff" />}
                        <text x={i * stepX} y={chartHeight + 35} fontSize={10} textAnchor="middle" fill="#aaa">{d.time}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-dark table-sm text-center">
                    <thead>
                      <tr>
                        <th>Час</th>
                        <th>Температура (°C)</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {_.orderBy(zoomed, ['timestamp'], ['desc']).map((d, i) => (
                        <tr key={i} className={i === 0 ? "table-primary" : ""}>
                          <td>{d.time}</td>
                          <td>{isNaN(d.temp) ? "--" : d.temp.toFixed(1)}</td>
                          <td>{d.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}