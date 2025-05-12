"use client";

import { useState, useEffect, useRef } from "react";
import _ from "lodash";

interface SensorPoint {
  timestamp: number;
  humidity: number;
  temperature: number;
  sensorId: string;
}

const SENSOR_IDS = ["HUM1-1", "HUM1-2"];

const COLORS: Record<string, { temp: string; hum: string }> = {
  "HUM1-1": { temp: "#66ff66", hum: "#44c0ff" },
  "HUM1-2": { temp: "#ffa500", hum: "#ff4444" },
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

        const now = Date.now();

        const newData: SensorPoint[] = [];

        SENSOR_IDS.forEach(id => {
          const s = sensors[id];
          if (s) {
            const t = parseFloat(String(s.temperature));
            const h = parseFloat(String(s.humidity));
            const ts = Number(s.timestamp);
            if (!isNaN(t) && !isNaN(h)) {
              newData.push({ timestamp: ts, temperature: t, humidity: h, sensorId: id });
            }
          }
        });

        setData(prev => {
          const combined = [...prev, ...newData];
          const unique = _.uniqBy(combined, d => `${d.sensorId}-${d.timestamp}`);
          return unique.filter(d => now - d.timestamp <= selectedPeriod.minutes * 60000);
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

  const chartHeight = 300;
  const maxTemp = 100;
  const maxHum = 100;
  const padding = 50;

  const grouped = _.groupBy(data, d => d.sensorId);
  const allTimestamps = _.uniq(data.map(d => Math.floor(d.timestamp / 300000) * 300000)).sort((a, b) => a - b);
  const stepX = 60;
  const width = allTimestamps.length * stepX;

  const normY = (val: number, max: number) => chartHeight - (val / max) * chartHeight;

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });

  const downloadCSV = () => {
    if (!data.length) return alert("Немає даних для експорту");
    const header = "Сенсор,Час,Температура,Вологість";
    const rows = data.map(d =>
      `${d.sensorId},${formatTime(d.timestamp)},${d.temperature.toFixed(1)},${d.humidity.toFixed(1)}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `humidity-dht21.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-4 position-relative">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h5>Графік DHT21 (температура та вологість): {SENSOR_IDS.join(", ")}</h5>
        <select
          className="form-select w-auto"
          value={selectedPeriod.label}
          onChange={(e) =>
            setSelectedPeriod(PERIOD_OPTIONS.find((p) => p.label === e.target.value) || PERIOD_OPTIONS[0])
          }
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
        </select>
        <button className="btn btn-outline-primary btn-sm" onClick={downloadCSV}>Завантажити CSV</button>
        <span className="text-secondary">Оновлено: {lastUpdate.toLocaleTimeString()}</span>
      </div>

      <div className="d-flex" style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: chartHeight + 60, width: padding, zIndex: 2, background: "#2b2b2b" }}>
          <svg width={padding} height={chartHeight + 60}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              const val = maxTemp - (i * maxTemp) / 10;
              return <text key={i} x={5} y={y + 4} fontSize={11} fill="#aaa">{val}°</text>;
            })}
          </svg>
        </div>

        <div ref={containerRef} style={{ overflowX: "auto", marginLeft: padding, marginRight: padding, width: "100%" }}>
          <svg width={width} height={chartHeight + 60}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              return <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="#444" />;
            })}

            {SENSOR_IDS.map((id) => {
              const sensorData = grouped[id] || [];
              const sensorPoints = allTimestamps.map(ts =>
                sensorData.find(d => Math.floor(d.timestamp / 300000) * 300000 === ts) || null
              );
              const humPath = sensorPoints.map((d, i) => d ? `${i === 0 ? "M" : "L"} ${i * stepX},${normY(d.humidity, maxHum)}` : null).filter(Boolean).join(" ");
              const tempPath = sensorPoints.map((d, i) => d ? `${i === 0 ? "M" : "L"} ${i * stepX},${normY(d.temperature, maxTemp)}` : null).filter(Boolean).join(" ");

              return (
                <g key={id}>
                  <path d={humPath} stroke={COLORS[id].hum} fill="none" strokeWidth={2} />
                  <path d={tempPath} stroke={COLORS[id].temp} fill="none" strokeWidth={2} />
                  {sensorPoints.map((d, i) => d && (
                    <g key={i}>
                      <circle cx={i * stepX} cy={normY(d.humidity, maxHum)} r={3} fill={COLORS[id].hum} />
                      <circle cx={i * stepX} cy={normY(d.temperature, maxTemp)} r={3} fill={COLORS[id].temp} />
                      <text x={i * stepX} y={normY(d.temperature, maxTemp) - 10} fontSize={10} fill={COLORS[id].temp} textAnchor="middle">
                        {d.temperature.toFixed(1)}°
                      </text>
                      <text x={i * stepX} y={normY(d.humidity, maxHum) + 14} fontSize={10} fill={COLORS[id].hum} textAnchor="middle">
                        {d.humidity.toFixed(1)}%
                      </text>
                      <text x={i * stepX} y={chartHeight + 50} fontSize={9} fill="#aaa" textAnchor="middle">
                        {formatTime(d.timestamp)}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ position: "absolute", right: 0, top: 0, height: chartHeight + 60, width: padding, zIndex: 2, background: "#2b2b2b" }}>
          <svg width={padding} height={chartHeight + 60}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              const val = maxHum - (i * maxHum) / 10;
              return <text key={i} x={5} y={y + 4} fontSize={11} fill="#aaa">{val}%</text>;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
