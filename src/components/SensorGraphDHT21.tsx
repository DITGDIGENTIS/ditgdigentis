"use client";

import { useState, useEffect, useRef } from "react";
import _ from "lodash";

type SensorPoint = {
  timestamp: number;
  humidity: number;
  temperature: number;
};

const PERIOD_OPTIONS = [
  { label: "1 година", minutes: 60 },
  { label: "12 годин", minutes: 720 },
  { label: "1 день", minutes: 1440 },
];

export default function SensorGraphDHT21() {
  const [data, setData] = useState<SensorPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/humidity", { cache: "no-store" });
        const { sensors } = await res.json();
        const s = sensors["HUM1-1"];
        if (s) {
          const t = parseFloat(String(s.temperature));
          const h = parseFloat(String(s.humidity));
          const ts = Number(s.timestamp);
          if (!isNaN(t) && !isNaN(h)) {
            setData((prev) => {
              const updated = [...prev, { timestamp: ts, temperature: t, humidity: h }];
              return _.uniqBy(updated, "timestamp").filter(
                (d) => ts - d.timestamp <= selectedPeriod.minutes * 60000
              );
            });
            setLastUpdate(new Date());
          }
        }
      } catch (e) {
        console.error("❌ Fetch DHT21 error:", e);
      }
    };
    fetchData();
    const int = setInterval(fetchData, 5000);
    return () => clearInterval(int);
  }, [selectedPeriod]);

  const width = Math.max(600, data.length * 80);
  const height = 300;
  const stepX = width / Math.max(1, data.length - 1);
  const maxTemp = 100;
  const maxHum = 100;

  const normY = (val: number, max: number) => height - (val / max) * height;
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });

  const downloadCSV = () => {
    if (!data.length) return alert("Немає даних для експорту");
    const header = "Час,Температура,Вологість";
    const rows = data.map((d) => `${formatTime(d.timestamp)},${d.temperature.toFixed(1)},${d.humidity.toFixed(1)}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `humidity-HUM1-1.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h5>Графік DHT21: температура і вологість</h5>
        <select
          className="form-select w-auto"
          value={selectedPeriod.label}
          onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find((p) => p.label === e.target.value) || PERIOD_OPTIONS[0])}
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
        <button className="btn btn-outline-primary btn-sm" onClick={downloadCSV}>
          Завантажити CSV
        </button>
        <span className="text-secondary">Оновлено: {lastUpdate.toLocaleTimeString()}</span>
      </div>

      <div ref={containerRef} style={{ overflowX: "auto" }}>
        <svg width={width + 120} height={height + 80}>
          {/* Шкала температури зліва */}
          {[...Array(11)].map((_, i) => {
            const y = (height / 10) * i;
            const temp = 100 - i * 10;
            return (
              <text key={i} x={5} y={y + 4} fontSize={12} fill="#aaa">
                {temp}°
              </text>
            );
          })}

          {/* Шкала вологості справа */}
          {[...Array(11)].map((_, i) => {
            const y = (height / 10) * i;
            const hum = 100 - i * 10;
            return (
              <text key={i} x={width + 40} y={y + 4} fontSize={12} fill="#aaa">
                {hum}%
              </text>
            );
          })}

          {/* Лінії по графіку */}
          {[...Array(11)].map((_, i) => {
            const y = (height / 10) * i;
            return <line key={i} x1={30} y1={y} x2={width + 30} y2={y} stroke="#333" />;
          })}

          {/* Лінії та точки графіка */}
          <path d={data.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX + 30},${normY(d.humidity, maxHum)}`).join(" ")} stroke="#44c0ff" fill="none" strokeWidth={2} />
          <path d={data.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX + 30},${normY(d.temperature, maxTemp)}`).join(" ")} stroke="#66ff66" fill="none" strokeWidth={2} />

          {data.map((d, i) => (
            <g key={i}>
              <circle cx={i * stepX + 30} cy={normY(d.humidity, maxHum)} r={3} fill="#44c0ff" />
              <circle cx={i * stepX + 30} cy={normY(d.temperature, maxTemp)} r={3} fill="#66ff66" />
              <text x={i * stepX + 30} y={height + 25} fontSize={10} fill="#999" textAnchor="middle">
                {formatTime(d.timestamp)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
