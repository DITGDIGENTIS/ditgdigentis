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

const SENSOR_OPTIONS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];
const PERIOD_OPTIONS = [
  { label: "1 година", minutes: 60 },
  { label: "12 годин", minutes: 720 },
  { label: "1 день", minutes: 1440 },
  { label: "1 місяць", minutes: 43200 },
  { label: "1 рік", minutes: 525600 },
];

const COLORS = ["#44c0ff", "#ffa500", "#ff4444", "#66ff66"];

export default function SensorGraphDS18B20() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [selectedSensor, setSelectedSensor] = useState<string | "ALL">("ALL");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/sensor-readings", { cache: "no-store" });
        const readings = await response.json();
        setSensorData(readings);
        setLastUpdate(new Date());
      } catch (e) {
        console.error("Failed to fetch sensor data", e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartHeight = 300;
  const maxTemp = 100;
  const normTempY = (t: number) => chartHeight - (t / maxTemp) * chartHeight;

  const filterData = () => {
    const filtered = sensorData.map((d) => {
      const date = new Date(d.timestamp);
      return {
        time: date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" }),
        temp: d.temperature,
        hum: d.humidity ?? 0,
        date: date.toLocaleDateString("uk-UA"),
        timestamp: date.getTime(),
        sensor_id: d.sensor_id,
      };
    });
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - selectedPeriod.minutes * 60000);
    return filtered.filter((d) => d.timestamp >= rangeStart.getTime() && d.timestamp <= rangeEnd.getTime());
  };

  const data = filterData();
  const grouped = _.groupBy(data, "sensor_id");
  const visibleSensors = selectedSensor === "ALL" ? SENSOR_OPTIONS : [selectedSensor];
  const maxPoints = Math.max(...visibleSensors.map((id) => grouped[id]?.length || 0), 0);
  const stepX = 60;
  const width = maxPoints * stepX + 60;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: 5 }}>
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center justify-content-between">
        <h5 className="text-warning mb-0">Графік температури</h5>
        <div className="d-flex gap-2 flex-wrap">
          <input type="date" className="form-control" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <select className="form-select" value={selectedSensor} onChange={(e) => setSelectedSensor(e.target.value)}>
            <option value="ALL">Всі</option>
            {SENSOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" value={selectedPeriod.label} onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find(p => p.label === e.target.value) || PERIOD_OPTIONS[0])}>
            {PERIOD_OPTIONS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="text-warning mb-3">Оновлено: {lastUpdate.toLocaleTimeString()}</div>

      <div style={{ overflowX: "auto" }}>
        <svg width={width} height={chartHeight + 80}>
          {[...Array(11)].map((_, i) => {
            const y = (i * chartHeight) / 10;
            const temp = maxTemp - (i * maxTemp) / 10;
            return (
              <g key={i}>
                <line x1={40} y1={y} x2={width} y2={y} stroke="#444" />
                <text x={0} y={y + 4} fontSize={12} fill="#aaa">{temp}°</text>
              </g>
            );
          })}
          {visibleSensors.map((sensorId, sIdx) => {
            const points = grouped[sensorId] || [];
            const pathD = points.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX + 40},${normTempY(d.temp)}`).join(" ");
            return (
              <g key={sensorId}>
                <path d={pathD} stroke={COLORS[sIdx % COLORS.length]} fill="none" strokeWidth={2} />
                {points.map((d, i) => (
                  <g key={i}>
                    <circle cx={i * stepX + 40} cy={normTempY(d.temp)} r={3} fill={COLORS[sIdx % COLORS.length]} />
                    <text
                      x={i * stepX + 40}
                      y={normTempY(d.temp) - 10}
                      fontSize={11}
                      fill="#ccc"
                      textAnchor="middle"
                    >
                      {d.temp.toFixed(1)}°
                    </text>
                    <text
                      x={i * stepX + 40}
                      y={chartHeight + 70}
                      fontSize={10}
                      fill="#999"
                      textAnchor="middle"
                    >
                      {d.time}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
