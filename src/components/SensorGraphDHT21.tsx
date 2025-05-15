"use client";

import React, { useEffect, useState } from "react";
import _ from "lodash";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SensorPoint {
  sensor_id: string;
  timestamp: number;
  humidity: number;
  temperature: number;
}

interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

const SENSOR_IDS = ["HUM1-1", "HUM1-2"] as const;
type SensorId = (typeof SENSOR_IDS)[number];
type ColorKey = `${SensorId}_humidity` | `${SensorId}_temperature`;

const COLORS = {
  "HUM1-1_humidity": "#4dabf7",
  "HUM1-1_temperature": "#ffa500",
  "HUM1-2_humidity": "#339af0",
  "HUM1-2_temperature": "#ff6b6b",
} as const;

const PERIOD_OPTIONS = [
  { label: "1 година", minutes: 60 },
  { label: "12 годин", minutes: 720 },
  { label: "1 день", minutes: 1440 },
];

export default function SensorGraphDHT21() {
  const [historicalData, setHistoricalData] = useState<SensorPoint[]>([]);
  const [liveData, setLiveData] = useState<Record<string, SensorPoint>>({});
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedSensors, setSelectedSensors] = useState<string[]>([...SENSOR_IDS]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - selectedPeriod.minutes * 60 * 1000);

        const [historicalRes, liveRes] = await Promise.all([
          fetch(`/api/humidity-readings?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&sensorIds=${selectedSensors.join(',')}`, { 
            cache: "no-store" 
          }),
          fetch("/api/humidity", { cache: "no-store" }),
        ]);

        if (!historicalRes.ok || !liveRes.ok) {
          throw new Error(`Failed to fetch data: Historical ${historicalRes.status}, Live ${liveRes.status}`);
        }

        const readings = await historicalRes.json();
        const live = await liveRes.json();

        // Форматируем исторические данные
        const formattedHistorical = _.map(readings, (r) => ({
          sensor_id: r.sensor_id,
          timestamp: new Date(r.timestamp).getTime(),
          humidity: Number(Number(r.humidity).toFixed(1)),
          temperature: Number(Number(r.temperature).toFixed(1)),
        }));

        // Форматируем живые данные
        const formattedLive = _.mapValues(live.sensors, (s) => ({
          sensor_id: s.id,
          timestamp: Number(s.timestamp),
          humidity: Number(Number(s.humidity).toFixed(1)),
          temperature: Number(Number(s.temperature).toFixed(1)),
        }));

        setHistoricalData(formattedHistorical);
        setLiveData(formattedLive);
        setLastUpdate(new Date());
      } catch (e) {
        console.error("Failed to fetch sensor data:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedPeriod, selectedSensors]);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatData = (): ChartDataPoint[] => {
    const selectedDateStart = new Date(selectedDate);
    selectedDateStart.setHours(0, 0, 0, 0);

    const selectedDateEnd = new Date(selectedDate);
    selectedDateEnd.setHours(23, 59, 59, 999);

    const filtered = historicalData.filter(
      (d) =>
        d.timestamp >= selectedDateStart.getTime() &&
        d.timestamp <= selectedDateEnd.getTime() &&
        selectedSensors.includes(d.sensor_id)
    );

    const groupedByTime = _.groupBy(filtered, (point) => {
      const date = new Date(point.timestamp);
      if (selectedPeriod.minutes <= 60) {
        return date.toISOString();
      } else if (selectedPeriod.minutes <= 720) {
        return `${date.getHours()}:${Math.floor(date.getMinutes() / 5) * 5}`;
      } else if (selectedPeriod.minutes <= 1440) {
        return `${date.getHours()}:${Math.floor(date.getMinutes() / 15) * 15}`;
      } else if (selectedPeriod.minutes <= 10080) {
        return `${date.getDate()} ${date.getHours()}:00`;
      } else if (selectedPeriod.minutes <= 43200) {
        return `${date.getDate()} ${date.getHours()}:00`;
      } else {
        return `${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:00`;
      }
    });

    const chartData = _.map(groupedByTime, (points, timeKey) => {
      const dataPoint: ChartDataPoint = {
        timestamp: points[0].timestamp,
        time: formatTime(points[0].timestamp),
      };

      points.forEach((point) => {
        const humidityKey = `${point.sensor_id}_humidity`;
        const tempKey = `${point.sensor_id}_temperature`;

        if (!dataPoint[humidityKey]) {
          dataPoint[humidityKey] = 0;
        }
        if (!dataPoint[tempKey]) {
          dataPoint[tempKey] = 0;
        }

        dataPoint[humidityKey] = point.humidity;
        dataPoint[tempKey] = point.temperature;
      });

      return dataPoint;
    });

    return _.orderBy(chartData, ["timestamp"], ["asc"]);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark p-2 border border-secondary rounded">
          <p className="mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="mb-0">
              {entry.name}: {entry.value.toFixed(1)}
              {entry.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const calculateAxisRanges = (data: ChartDataPoint[]) => {
    if (!data.length) return { humidity: [0, 100], temperature: [0, 50] };

    const humidityValues: number[] = [];
    const temperatureValues: number[] = [];

    data.forEach(point => {
      selectedSensors.forEach(sensorId => {
        const humidityKey = `${sensorId}_humidity`;
        const tempKey = `${sensorId}_temperature`;
        
        if (point[humidityKey] !== undefined) {
          humidityValues.push(Number(point[humidityKey]));
        }
        if (point[tempKey] !== undefined) {
          temperatureValues.push(Number(point[tempKey]));
        }
      });
    });

    const addPadding = (min: number, max: number, padding: number = 0.1): [number, number] => {
      const range = max - min;
      const paddingValue = range * padding;
      return [Math.max(0, min - paddingValue), max + paddingValue];
    };

    const humidityMin = Math.min(...humidityValues);
    const humidityMax = Math.max(...humidityValues);
    const tempMin = Math.min(...temperatureValues);
    const tempMax = Math.max(...temperatureValues);

    return {
      humidity: addPadding(humidityMin, humidityMax),
      temperature: addPadding(tempMin, tempMax)
    };
  };

  const data = formatData();
  const axisRanges = calculateAxisRanges(data);

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: 5 }}>
      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center justify-content-between">
        <h5 className="text-warning mb-0">Графік DHT21</h5>
        <div className="d-flex gap-2 flex-wrap">
          {SENSOR_IDS.map((id) => (
            <label key={id} className="form-check-label text-light">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={selectedSensors.includes(id)}
                onChange={(e) => {
                  setSelectedSensors(e.target.checked
                    ? [...selectedSensors, id]
                    : selectedSensors.filter((s) => s !== id));
                }}
              />
              {id}
            </label>
          ))}
          <select
            className="form-select"
            value={selectedPeriod.label}
            onChange={(e) => {
              const period = PERIOD_OPTIONS.find((p) => p.label === e.target.value) || PERIOD_OPTIONS[0];
              setSelectedPeriod(period);
            }}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Текущие значения */}
      <div className="d-flex flex-wrap gap-4 mb-3">
        {selectedSensors.map((sensorId) => {
          const livePoint = liveData[sensorId];
          return (
            <div key={sensorId} className="card bg-dark border-secondary">
              <div className="card-body">
                <h6 className="card-title text-warning">{sensorId}</h6>
                {livePoint ? (
                  <>
                    <p className="mb-1" style={{ color: COLORS[`${sensorId}_humidity` as ColorKey] }}>
                      Вологість: {livePoint.humidity.toFixed(1)}%
                    </p>
                    <p className="mb-1" style={{ color: COLORS[`${sensorId}_temperature` as ColorKey] }}>
                      Температура: {livePoint.temperature.toFixed(1)}°C
                    </p>
                    <small className="text-muted">
                      Оновлено: {new Date(livePoint.timestamp).toLocaleTimeString('uk-UA')}
                    </small>
                  </>
                ) : (
                  <p className="text-muted mb-0">Немає даних</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3">
        {selectedSensors.map((sensorId) => (
          <React.Fragment key={sensorId}>
            <div style={{ color: COLORS[`${sensorId}_humidity` as ColorKey] }}>
              {sensorId} Вологість
            </div>
            <div style={{ color: COLORS[`${sensorId}_temperature` as ColorKey] }}>
              {sensorId} Температура
            </div>
          </React.Fragment>
        ))}
      </div>

      <div style={{ width: "100%", height: 400, position: "relative" }}>
        <div style={{ 
          position: "sticky", 
          left: 0, 
          zIndex: 2, 
          backgroundColor: "#2b2b2b", 
          paddingRight: "10px", 
          width: windowWidth <= 768 ? 40 : 60, 
          height: 400
        }}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            width={windowWidth <= 768 ? 40 : 60}
            height={400}
          >
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#44c0ff"
              tick={{ fill: "#44c0ff" }}
              label={{
                value: "Вологість (%)",
                angle: -90,
                position: "insideLeft",
                fill: "#44c0ff",
              }}
              domain={axisRanges.humidity}
              allowDataOverflow={false}
              tickCount={5}
              tickFormatter={(value) => `${value}%`}
              scale="linear"
              allowDecimals={true}
              tickMargin={10}
            />
          </LineChart>
        </div>

        <div style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
          marginLeft: windowWidth <= 768 ? 40 : 0
        }}>
          <div style={{ minWidth: "max-content" }}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="time"
                  stroke="#999"
                  tick={{ fill: "#999", fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <Tooltip content={<CustomTooltip />} />
                {selectedSensors.map((sensorId) => (
                  <React.Fragment key={sensorId}>
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={`${sensorId}_humidity`}
                      name={`${sensorId} Вологість`}
                      stroke={COLORS[`${sensorId}_humidity` as ColorKey]}
                      dot={false}
                      unit="%"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={`${sensorId}_temperature`}
                      name={`${sensorId} Температура`}
                      stroke={COLORS[`${sensorId}_temperature` as ColorKey]}
                      dot={false}
                      unit="°C"
                      strokeWidth={2}
                    />
                  </React.Fragment>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{
          position: "sticky",
          right: 0,
          zIndex: 2,
          backgroundColor: "#2b2b2b",
          paddingLeft: "10px",
          width: windowWidth <= 768 ? 40 : 60,
          height: 400
        }}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            width={windowWidth <= 768 ? 40 : 60}
            height={400}
          >
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#ffa500"
              tick={{ fill: "#ffa500" }}
              label={{
                value: "Температура (°C)",
                angle: 90,
                position: "insideRight",
                fill: "#ffa500",
              }}
              domain={axisRanges.temperature}
              allowDataOverflow={false}
              tickCount={5}
              tickFormatter={(value) => `${value}°C`}
              scale="linear"
              allowDecimals={true}
              tickMargin={10}
            />
          </LineChart>
        </div>
      </div>
    </div>
  );
}
