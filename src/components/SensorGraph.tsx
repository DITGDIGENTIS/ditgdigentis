"use client";

import { useState } from "react";

interface DataPoint {
  time: string;
  temp: number;
  hum: number;
  date: string;
}

type SensorGraphDHT21Props = {
  sensorId: string;
};

const sampleData: DataPoint[] = Array.from({ length: 288 }, (_, i) => {
  const hour = Math.floor(i / 12).toString().padStart(2, "0");
  const minute = ((i % 12) * 5).toString().padStart(2, "0");
  return {
    time: `${hour}:${minute}`,
    temp: 20 + Math.sin(i / 20) * 2,
    hum: 65 + Math.cos(i / 15) * 5,
    date: "2025-05-07",
  };
});

export default function SensorGraphDHT21({ sensorId }: SensorGraphDHT21Props) {
  const [selectedDate, setSelectedDate] = useState("2025-05-07");
  const [zoomLevel, setZoomLevel] = useState(3);

  const chartHeight = 300;
  const stepX = 30;
  const minTemp = 0;
  const maxTemp = 50;
  const minHum = 20;
  const maxHum = 100;

  const normTempY = (t: number) => chartHeight - ((t - minTemp) / (maxTemp - minTemp)) * chartHeight;
  const normHumY = (h: number) => chartHeight - ((h - minHum) / (maxHum - minHum)) * chartHeight;

  const data = sampleData.filter((d) => d.date === selectedDate);

  const zoomed =
    zoomLevel === 3
      ? data
      : zoomLevel === 2
      ? data.filter((_, i) => i % 4 === 0)
      : zoomLevel === 1
      ? data.filter((_, i) => i % 12 === 0)
      : data.filter((_, i) => i % 24 === 0);

  const width = zoomed.length * stepX;

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: "5px" }}>
      <div className="row mb-3">
        <div className="col-md-4">
          <label className="form-label text-warning">Період:</label>
          <select className="form-select" value={zoomLevel} onChange={(e) => setZoomLevel(Number(e.target.value))}>
            <option value={3}>День</option>
            <option value={2}>Тиждень</option>
            <option value={1}>Місяць</option>
            <option value={0}>Рік</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label text-warning">Сенсор:</label>
          <input className="form-control" disabled value={sensorId} />
        </div>
        <div className="col-md-4">
          <label className="form-label text-warning">Дата:</label>
          <input type="date" className="form-control" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </div>
      <div className="d-flex justify-content-center gap-4 mb-2">
        <div className="d-flex align-items-center gap-2">
          <div style={{ width: 20, height: 10, backgroundColor: "#0f0" }}></div>
          <span style={{ color: "#0f0" }}>Temperature</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div style={{ width: 20, height: 10, backgroundColor: "#00f" }}></div>
          <span style={{ color: "#00f" }}>Humidity</span>
        </div>
      </div>
      <div className="position-relative" style={{ height: chartHeight + 50 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 40, width: 50, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {[...Array(11)].map((_, i) => (
            <div key={i} style={{ fontSize: 16, color: "#ff0", textAlign: "right" }}>{maxTemp - i * 5}</div>
          ))}
        </div>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 40, width: 50, display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "left" }}>
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ fontSize: 16, color: "#0cf" }}>{maxHum - i * 10}</div>
          ))}
        </div>
        <div style={{ overflowX: "auto", margin: "0 0px", borderRadius: "5px" }}>
          <svg width={width} height={chartHeight + 50}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              return <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="#444" />;
            })}

            <path
              d={zoomed.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX},${normTempY(d.temp)}`).join(" ")}
              stroke="#0f0"
              fill="none"
              strokeWidth={2}
            />
            <path
              d={zoomed.map((d, i) => `${i === 0 ? "M" : "L"} ${i * stepX},${normHumY(d.hum)}`).join(" ")}
              stroke="#00f"
              fill="none"
              strokeWidth={2}
            />

            {zoomed.map((d, i) => (
              <g key={i}>
                <circle cx={i * stepX} cy={normTempY(d.temp)} r={3} fill="#0f0" />
                <circle cx={i * stepX} cy={normHumY(d.hum)} r={3} fill="#00f" />
                {zoomLevel === 3 && (
                  <text x={i * stepX} y={chartHeight + 20} textAnchor="middle" fontSize={12} fill="#fff">
                    {d.time}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="mt-4 table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
        <table className="table table-dark table-bordered table-sm text-center">
          <thead>
            <tr>
              <th>Час</th>
              <th>Температура (°C)</th>
              <th>Вологість (%)</th>
            </tr>
          </thead>
          <tbody>
            {zoomed.slice(-24).map((d, i) => (
              <tr key={i}>
                <td>{d.time}</td>
                <td>{d.temp.toFixed(1)}</td>
                <td>{d.hum.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
