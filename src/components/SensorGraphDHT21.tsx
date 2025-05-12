"use client";

import { useEffect, useRef, useState } from "react";
import _ from "lodash";

interface SensorPoint {
  sensor_id: string;
  timestamp: number;
  humidity: number;
  temperature: number;
}

const SENSOR_IDS = ["HUM1-1", "HUM1-2"];
const COLORS = ["#44c0ff", "#ffa500"];
const PERIOD_OPTIONS = [
  { label: "1 година", minutes: 60 },
  { label: "12 годин", minutes: 720 },
  { label: "1 день", minutes: 1440 },
];

export default function SensorGraphDHT21() {
  const [data, setData] = useState<SensorPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedSensors, setSelectedSensors] = useState<string[]>([...SENSOR_IDS]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const { sensors, serverTime } = await res.json();

        const now = Date.now();
        const points: SensorPoint[] = SENSOR_IDS.map((id) => {
          const s = sensors[id];
          if (!s) return null;
          const t = parseFloat(String(s.temperature));
          const h = parseFloat(String(s.humidity));
          const ts = Number(s.timestamp);
          if (isNaN(t) || isNaN(h)) return null;
          return { sensor_id: id, timestamp: ts, temperature: t, humidity: h };
        }).filter(Boolean) as SensorPoint[];

        setData((prev) => {
          const merged = [...prev, ...points];
          return _.uniqBy(merged, (d) => `${d.sensor_id}-${d.timestamp}`)
            .filter((d) => now - d.timestamp <= selectedPeriod.minutes * 60000);
        });
        setLastUpdate(new Date());
      } catch (e) {
        console.error("❌ Fetch DHT21 error:", e);
      }
    };
    fetchData();
    const int = setInterval(fetchData, 5000);
    return () => clearInterval(int);
  }, [selectedPeriod]);

  const width = Math.max(800, data.length * 50);
  const height = 300;
  const padding = 60;
  const stepX = 60;
  const maxTemp = 100;
  const maxHum = 100;

  const normY = (val: number, max: number) => height - (val / max) * height;
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });

  const downloadCSV = (sensorId: string) => {
    const filtered = data.filter(d => d.sensor_id === sensorId);
    if (!filtered.length) return alert(`Немає даних для ${sensorId}`);
    const header = "Час,Температура,Вологість";
    const rows = filtered.map((d) => `${formatTime(d.timestamp)},${d.temperature.toFixed(1)},${d.humidity.toFixed(1)}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sensorId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: 5 }}>
      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center justify-content-between">
        <h5 className="text-warning mb-0">Графік DHT21 (Температура/Вологість)</h5>
        <div className="d-flex gap-2 flex-wrap">
          {SENSOR_IDS.map((id) => (
            <label key={id} className="form-check-label text-light">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedSensors.includes(id)}
                onChange={(e) => {
                  const updated = e.target.checked
                    ? [...selectedSensors, id]
                    : selectedSensors.filter((s) => s !== id);
                  setSelectedSensors(updated);
                }}
              />
              {id}
            </label>
          ))}
          <select
            className="form-select"
            value={selectedPeriod.label}
            onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find(p => p.label === e.target.value) || PERIOD_OPTIONS[0])}
          >
            {PERIOD_OPTIONS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
          {SENSOR_IDS.map(id => (
            <button key={id} className="btn btn-outline-light btn-sm" onClick={() => downloadCSV(id)}>
              CSV {id}
            </button>
          ))}
        </div>
      </div>

      <div className="text-warning mb-3">Оновлено: {lastUpdate.toLocaleTimeString()}</div>

      <div className="d-flex" style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: height + 60, width: padding, background: "#2b2b2b", zIndex: 2 }}>
          <svg width={padding} height={height + 60}>
            {[...Array(11)].map((_, i) => (
              <text key={i} x={5} y={(i * height) / 10 + 4} fontSize={11} fill="#aaa">{maxTemp - i * 10}°</text>
            ))}
          </svg>
        </div>

        <div ref={containerRef} style={{ overflowX: "auto", marginLeft: padding, marginRight: padding, width: "100%" }}>
          <svg width={width} height={height + 60}>
            {[...Array(11)].map((_, i) => (
              <line key={i} x1={0} y1={(i * height) / 10} x2={width} y2={(i * height) / 10} stroke="#444" />
            ))}
            {selectedSensors.map((sensorId, idx) => {
              const points = data.filter(d => d.sensor_id === sensorId);
              const color = COLORS[idx % COLORS.length];
              return (
                <g key={sensorId}>
                  <path
                    d={points.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX},${normY(d.temperature, maxTemp)}`).join(" ")}
                    stroke={color}
                    fill="none"
                    strokeWidth={2}
                  />
                  <path
                    d={points.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX},${normY(d.humidity, maxHum)}`).join(" ")}
                    stroke="#44c0ff"
                    fill="none"
                    strokeDasharray="4 2"
                    strokeWidth={1.5}
                  />
                  {points.map((d, i) => (
                    <g key={i}>
                      <circle cx={i * stepX} cy={normY(d.temperature, maxTemp)} r={3} fill={color} />
                      <circle cx={i * stepX} cy={normY(d.humidity, maxHum)} r={3} fill="#44c0ff" />
                      <text x={i * stepX} y={normY(d.temperature, maxTemp) - 10} fontSize={10} fill={color} textAnchor="middle">
                        {d.temperature.toFixed(1)}°
                      </text>
                      <text x={i * stepX} y={normY(d.humidity, maxHum) + 14} fontSize={10} fill="#44c0ff" textAnchor="middle">
                        {d.humidity.toFixed(1)}%
                      </text>
                      <text x={i * stepX} y={height + 50} fontSize={9} fill="#999" textAnchor="middle">
                        {formatTime(d.timestamp)}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ position: "absolute", right: 0, top: 0, height: height + 60, width: padding, background: "#2b2b2b", zIndex: 2 }}>
          <svg width={padding} height={height + 60}>
            {[...Array(11)].map((_, i) => (
              <text key={i} x={5} y={(i * height) / 10 + 4} fontSize={11} fill="#aaa">{maxHum - i * 10}%</text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
