"use client";

import { useState, useEffect, useRef } from "react";
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
  const [liveData, setLiveData] = useState<Record<string, SensorDataPoint>>({});
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([...SENSOR_OPTIONS]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historicalRes, liveRes] = await Promise.all([
          fetch("/api/sensor-readings", { cache: "no-store" }),
          fetch("/api/sensors", { cache: "no-store" }),
        ]);

        const readings = await historicalRes.json();
        const live = await liveRes.json();

        setSensorData(readings);
        setLiveData(live?.sensors || {});
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

  const formatData = (): DataPoint[] => {
    const mapped = sensorData.map((d) => {
      const date = new Date(d.timestamp);
      const rounded = Math.floor(date.getTime() / 300000) * 300000;
      const roundedDate = new Date(rounded);
      return {
        time: roundedDate.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" }),
        temp: d.temperature,
        hum: d.humidity ?? 0,
        date: roundedDate.toLocaleDateString("uk-UA"),
        timestamp: roundedDate.getTime(),
        sensor_id: d.sensor_id,
      };
    });

    const selectedDay = new Date(selectedDate);
    selectedDay.setHours(0, 0, 0, 0);
    const rangeStart = new Date(selectedDay.getTime());
    const fullEnd = new Date(rangeStart.getTime() + selectedPeriod.minutes * 60000);
    const rangeEnd = selectedDate === new Date().toISOString().split("T")[0] ? new Date() : fullEnd;

    const timeSlots: number[] = [];
    for (let t = rangeStart.getTime(); t <= rangeEnd.getTime(); t += 300000) {
      timeSlots.push(t);
    }

    const filled: DataPoint[] = [];

    for (const sensor of SENSOR_OPTIONS) {
      const sensorPoints = mapped
        .filter((d) => d.sensor_id === sensor)
        .reduce((acc, d) => {
          acc[d.timestamp] = d;
          return acc;
        }, {} as Record<number, DataPoint>);

      let lastKnown: DataPoint | null = null;

      for (const slot of timeSlots) {
        if (sensorPoints[slot]) {
          lastKnown = sensorPoints[slot];
          filled.push(sensorPoints[slot]);
        } else if (lastKnown && selectedSensors.includes(sensor)) {
          const liveTemp = liveData?.[sensor]?.temperature;
          filled.push({
            ...lastKnown,
            temp: typeof liveTemp === "number" ? liveTemp : lastKnown.temp,
            timestamp: slot,
            time: new Date(slot).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" }),
            date: new Date(slot).toLocaleDateString("uk-UA"),
          });
        }
      }
    }

    return _.orderBy(filled, ["timestamp"], ["asc"]);
  };

  const data = formatData();
  const visibleSensors = selectedSensors;
  const allTimestamps = _.uniq(data.map((d) => d.timestamp)).sort((a, b) => a - b);
  const stepX = 60;
  const yAxisWidth = 60;
  const width = allTimestamps.length * stepX;

  const downloadCSV = () => {
    const filtered = data.filter(d => selectedSensors.includes(d.sensor_id));
    if (filtered.length === 0) {
      alert("Немає даних для експорту");
      return;
    }
    const header = "Дата,Час,Сенсор,Температура,Вологість";
    const rows = filtered.map(d => `${d.date},${d.time},${d.sensor_id},${d.temp},${d.hum}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sensors-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: 5 }}>
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center justify-content-between">
        <h5 className="text-warning mb-0">Графік температури</h5>
        <div className="d-flex gap-2 flex-wrap">
          <input type="date" className="form-control" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <div className="d-flex flex-wrap align-items-center gap-2">
            {SENSOR_OPTIONS.map((sensor) => (
              <label key={sensor} className="form-check-label text-light me-2">
                <input
                  type="checkbox"
                  className="form-check-input me-1"
                  checked={selectedSensors.includes(sensor)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...selectedSensors, sensor]
                      : selectedSensors.filter((s) => s !== sensor);
                    setSelectedSensors(updated);
                  }}
                />
                {sensor} ({liveData[sensor]?.temperature?.toFixed(1) || "--"}°)
              </label>
            ))}
          </div>
          <select className="form-select" value={selectedPeriod.label} onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find(p => p.label === e.target.value) || PERIOD_OPTIONS[0])}>
            {PERIOD_OPTIONS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
          <button className="btn btn-outline-light" onClick={downloadCSV}>Завантажити CSV</button>
        </div>
      </div>

      <div className="text-warning mb-3">Оновлено: {lastUpdate.toLocaleTimeString()}</div>

      <div style={{ display: "flex", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: chartHeight + 80, width: yAxisWidth, backgroundColor: "#2b2b2b", zIndex: 2 }}>
          <svg width={yAxisWidth} height={chartHeight + 80}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              const temp = maxTemp - (i * maxTemp) / 10;
              return (
                <g key={i}>
                  <text x={5} y={y + 4} fontSize={12} fill="#aaa">{temp}°</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div ref={containerRef} style={{ overflowX: "auto", marginLeft: yAxisWidth, width: "100%" }}>
          <svg width={width} height={chartHeight + 80}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              return <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="#444" />;
            })}
            {visibleSensors.map((sensorId, sIdx) => {
              const sensorPoints = data.filter((d) => d.sensor_id === sensorId);
              const points = allTimestamps.map((ts) => sensorPoints.find((d) => d.timestamp === ts) || null);
              const pathD = points.map((d, i) => d ? `${i === 0 ? "M" : "L"} ${i * stepX},${normTempY(d.temp)}` : null).filter(Boolean).join(" ");
              return (
                <g key={sensorId}>
                  <path d={pathD} stroke={COLORS[sIdx % COLORS.length]} fill="none" strokeWidth={2} />
                  {points.map((d, i) => (
                    d ? (
                      <g key={i}>
                        <circle cx={i * stepX} cy={normTempY(d.temp)} r={3} fill={COLORS[sIdx % COLORS.length]} />
                        <text x={i * stepX} y={normTempY(d.temp) - 10} fontSize={11} fill="#ccc" textAnchor="middle">
                          {d.temp.toFixed(1)}°
                        </text>
                        <text x={i * stepX} y={chartHeight + 70} fontSize={10} fill="#999" textAnchor="middle">
                          {d.time}
                        </text>
                      </g>
                    ) : null
                  ))}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
