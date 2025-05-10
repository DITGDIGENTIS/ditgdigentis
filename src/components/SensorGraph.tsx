"use client";

import { useState, useEffect } from "react";
import _ from "lodash";
import { SensorDataPoint } from "../services/sensor-data.service";

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
  const hour = Math.floor(i / 12)
    .toString()
    .padStart(2, "0");
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
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/sensor-readings');
        if (!response.ok) {
          throw new Error('Failed to fetch sensor data');
        }
        const readings = await response.json();
        
        if (!readings || !Array.isArray(readings)) {
          console.error("Component: Invalid readings format:", readings);
          return;
        }
        
        setSensorData(readings);
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Component: Error fetching sensor data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartHeight = 300;
  const stepX = 30;
  const minTemp = 0;
  const maxTemp = 50;
  const minHum = 20;
  const maxHum = 100;

  const normTempY = (t: number) =>
    chartHeight - ((t - minTemp) / (maxTemp - minTemp)) * chartHeight;
  const normHumY = (h: number) =>
    chartHeight - ((h - minHum) / (maxHum - minHum)) * chartHeight;

  const data = sampleData.filter((d) => d.date === selectedDate);

  const filterByZoom = (arr: DataPoint[]) => {
    if (zoomLevel === 3) return arr;
    if (zoomLevel === 2) return arr.filter((_, i) => i % 4 === 0);
    if (zoomLevel === 1) return arr.filter((_, i) => i % 12 === 0);
    return arr.filter((_, i) => i % 24 === 0);
  };

  const zoomed = filterByZoom(data);

  const width = zoomed.length * stepX;

  // Фильтрация данных для DS18B20
  const getSensor1Data = () => {
    
    // Разделяем данные по сенсорам
    const sensor1Data = _.filter(sensorData, (data) => data.sensor_id === "SENSOR1-1");
    const sensor2Data = _.filter(sensorData, (data) => data.sensor_id === "SENSOR1-2");
    
    // Форматируем данные для каждого сенсора
    const formatSensorData = (data: SensorDataPoint[]) => {
      const formatted = _.map(data, (reading) => {
        const date = new Date(reading.timestamp || new Date());
        return {
          time: date.toLocaleTimeString('uk-UA', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
          }),
          temp: reading.temperature,
          hum: 0,
          date: date.toLocaleDateString('uk-UA'),
          timestamp: date.getTime() // для сортировки
        };
      });
      
      // Сортируем по времени (новые сверху)
      return _.orderBy(formatted, ['timestamp'], ['desc']);
    };

    return {
      sensor1: formatSensorData(sensor1Data),
      sensor2: formatSensorData(sensor2Data)
    };
  };

  const { sensor1, sensor2 } = getSensor1Data();
  const zoomedSensor1 = filterByZoom(sensor1);
  const zoomedSensor2 = filterByZoom(sensor2);

  const handleDelete = async (sensorId: string) => {
    if (!confirm(`Ви впевнені, що хочете видалити всі дані для сенсора ${sensorId}?`)) {
      return;
    }

    try {
      setIsDeleting(prev => ({ ...prev, [sensorId]: true }));
      const response = await fetch(`/api/sensor-records/delete?sensorId=${sensorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete records');
      }

      const result = await response.json();
      console.log('Delete result:', result);
      
      // Обновляем данные после удаления
      setSensorData(prev => prev.filter(data => data.sensor_id !== sensorId));
    } catch (error) {
      console.error('Error deleting records:', error);
      alert('Помилка при видаленні даних');
    } finally {
      setIsDeleting(prev => ({ ...prev, [sensorId]: false }));
    }
  };

  return (
    <div
      className="container-fluid py-4"
      style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: "5px" }}
    >
      <div className="row mb-3">
        <div className="col-4 col-md-4">
          <label className="form-label text-warning">Період:</label>
          <select
            className="form-select"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
          >
            <option value={3}>День</option>
            <option value={2}>Тиждень</option>
            <option value={1}>Місяць</option>
            <option value={0}>Рік</option>
          </select>
        </div>
        <div className="col-4 col-md-4">
          <label className="form-label text-warning">Сенсор:</label>
          <input className="form-control" disabled value={sensorId} />
        </div>
        <div className="col-4 col-md-4">
          <label className="form-label text-warning">Дата:</label>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-4">
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 20, height: 10, backgroundColor: "#0f0" }}></div>
            <span style={{ color: "#0f0" }}>Temperature</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 20, height: 10, backgroundColor: "#00f" }}></div>
            <span style={{ color: "#00f" }}>Humidity</span>
          </div>
        </div>
        <div className="text-warning">
          {isLoading ? (
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          ) : (
            <span className="text-success">✓</span>
          )}
          Останнє оновлення: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      <div className="position-relative" style={{ height: chartHeight + 50 }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 40,
            width: 50,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {[...Array(11)].map((_, i) => (
            <div
              key={i}
              style={{ fontSize: 16, color: "#ff0", textAlign: "right" }}
            >
              {maxTemp - i * 5}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 40,
            width: 50,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            textAlign: "left",
          }}
        >
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ fontSize: 16, color: "#0cf" }}>
              {maxHum - i * 10}
            </div>
          ))}
        </div>
        <div
          style={{ overflowX: "auto", margin: "0 0px", borderRadius: "5px" }}
        >
          <svg width={width} height={chartHeight + 50}>
            {[...Array(11)].map((_, i) => {
              const y = (i * chartHeight) / 10;
              return (
                <line key={i} x1={0} y1={y} x2={width} y2={y} stroke="#444" />
              );
            })}

            <path
              d={zoomed
                .map(
                  (d, i) =>
                    `${i === 0 ? "M" : "L"} ${i * stepX},${normTempY(d.temp)}`
                )
                .join(" ")}
              stroke="#0f0"
              fill="none"
              strokeWidth={2}
            />
            <path
              d={zoomed
                .map(
                  (d, i) =>
                    `${i === 0 ? "M" : "L"} ${i * stepX},${normHumY(d.hum)}`
                )
                .join(" ")}
              stroke="#00f"
              fill="none"
              strokeWidth={2}
            />

            {zoomed.map((d, i) => (
              <g key={i}>
                <circle
                  cx={i * stepX}
                  cy={normTempY(d.temp)}
                  r={3}
                  fill="#0f0"
                />
                <circle cx={i * stepX} cy={normHumY(d.hum)} r={3} fill="#00f" />
                {zoomLevel === 3 && (
                  <text
                    x={i * stepX}
                    y={chartHeight + 20}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#fff"
                  >
                    {d.time}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Таблица для SENSOR1-1 */}
      <div className="mt-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="text-info mb-0">
            Дані з температурного сенсора SENSOR1-1 (DS18B20)
            {isLoading && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
          </h6>
          <button 
            className="btn btn-danger btn-sm"
            onClick={() => handleDelete('SENSOR1-1')}
            disabled={isDeleting['SENSOR1-1']}
          >
            {isDeleting['SENSOR1-1'] ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Видалення...
              </>
            ) : (
              'Видалити всі дані'
            )}
          </button>
        </div>
        <div className="text-warning mb-2">
          Кількість записів: {zoomedSensor1.length}
        </div>
        <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
          {zoomedSensor1.length > 0 ? (
            <table className="table table-bordered table-sm table-dark text-center">
              <thead>
                <tr>
                  <th>Час</th>
                  <th>Температура (°C)</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {zoomedSensor1.map((d, i) => (
                  <tr key={i}>
                    <td>{d.time}</td>
                    <td>{d.temp.toFixed(1)}</td>
                    <td>{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="alert alert-warning text-center">
              Немає даних для сенсора SENSOR1-1
            </div>
          )}
        </div>
      </div>

      {/* Таблица для SENSOR1-2 */}
      <div className="mt-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="text-info mb-0">
            Дані з температурного сенсора SENSOR1-2 (DS18B20)
            {isLoading && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
          </h6>
          <button 
            className="btn btn-danger btn-sm"
            onClick={() => handleDelete('SENSOR1-2')}
            disabled={isDeleting['SENSOR1-2']}
          >
            {isDeleting['SENSOR1-2'] ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Видалення...
              </>
            ) : (
              'Видалити всі дані'
            )}
          </button>
        </div>
        <div className="text-warning mb-2">
          Кількість записів: {zoomedSensor2.length}
        </div>
        <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
          {zoomedSensor2.length > 0 ? (
            <table className="table table-bordered table-sm table-dark text-center">
              <thead>
                <tr>
                  <th>Час</th>
                  <th>Температура (°C)</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {zoomedSensor2.map((d, i) => (
                  <tr key={i}>
                    <td>{d.time}</td>
                    <td>{d.temp.toFixed(1)}</td>
                    <td>{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="alert alert-warning text-center">
              Немає даних для сенсора SENSOR1-2
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
