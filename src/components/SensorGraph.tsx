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

type SensorGraphDS18B20Props = {
  sensorId: string;
};

const safeParseDate = (ts: any): Date => {
  try {
    if (ts instanceof Date) return ts;
    if (typeof ts === "string" || typeof ts === "number") {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {}
  return new Date();
};

const SensorGraphDS18B20 = ({ sensorId }: SensorGraphDS18B20Props) => {
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
        if (!response.ok) throw new Error('Failed to fetch sensor data');
        const readings = await response.json();
        if (!Array.isArray(readings)) return;
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

  const formatSensorData = (data: SensorDataPoint[]) =>
    _.orderBy(
      data.map((reading) => {
        const date = safeParseDate(reading.timestamp);
        return {
          time: date.toLocaleTimeString('uk-UA', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
          }),
          temp: reading.temperature,
          hum: 0,
          date: date.toLocaleDateString('uk-UA'),
          timestamp: date.getTime()
        };
      }),
      ['timestamp'],
      ['desc']
    );

  const filterByZoom = (arr: DataPoint[]) => {
    if (zoomLevel === 3) return arr;
    if (zoomLevel === 2) return arr.filter((_, i) => i % 4 === 0);
    if (zoomLevel === 1) return arr.filter((_, i) => i % 12 === 0);
    return arr.filter((_, i) => i % 24 === 0);
  };

  const chartHeight = 300;
  const stepX = 30;
  const maxTemp = 50;
  const normTempY = (t: number) => chartHeight - (t / maxTemp) * chartHeight;

  const data1 = filterByZoom(formatSensorData(sensorData.filter(d => d.sensor_id === "SENSOR1-1")));
  const data2 = filterByZoom(formatSensorData(sensorData.filter(d => d.sensor_id === "SENSOR1-2")));

  const width = Math.max(data1.length, data2.length) * stepX;

  const handleDelete = async (sensorId: string) => {
    if (!confirm(`Ви впевнені, що хочете видалити всі дані для сенсора ${sensorId}?`)) return;
    try {
      setIsDeleting(prev => ({ ...prev, [sensorId]: true }));
      const response = await fetch(`/api/sensor-records/delete?sensorId=${sensorId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete records');
      setSensorData(prev => prev.filter(d => d.sensor_id !== sensorId));
    } catch (error) {
      alert('Помилка при видаленні даних');
    } finally {
      setIsDeleting(prev => ({ ...prev, [sensorId]: false }));
    }
  };

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: "5px" }}>
      {/* UI controls and chart code (similar to original) */}
    </div>
  );
};

export default SensorGraphDS18B20;
