"use client";

import React, { useEffect, useState } from "react";
import * as _ from "lodash";
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

const generateColors = (
  sensorIds: readonly string[]
): Record<ColorKey, string> => {
  const colors: Record<string, string> = {};

  const humidityColors = [
    "#4dabf7", // Синий
    "#339af0", // Голубой
    "#228be6", // Темно-синий
    "#1c7ed6", // Морской
    "#1971c2", // Индиго
    "#1864ab", // Нави
    "#145591", // Океан
    "#0c4b8e", // Глубокий синий
  ];

  const temperatureColors = [
    "#ffa500", // Оранжевый
    "#ff6b6b", // Красный
    "#fa5252", // Алый
    "#f03e3e", // Киноварь
    "#e03131", // Кармин
    "#c92a2a", // Бордовый
    "#a61e1e", // Темно-красный
    "#862e2e", // Коричневый
  ];

  sensorIds.forEach((sensorId, index) => {
    const humidityColor = humidityColors[index % humidityColors.length];
    const temperatureColor =
      temperatureColors[index % temperatureColors.length];

    colors[`${sensorId}_humidity`] = humidityColor;
    colors[`${sensorId}_temperature`] = temperatureColor;
  });

  return colors as Record<ColorKey, string>;
};

const COLORS = generateColors(SENSOR_IDS);

const PERIOD_OPTIONS = [
  { label: "Всі дані", minutes: 0, format: "HH:mm:ss" },
  { label: "5 хвилин", minutes: 5, format: "HH:mm:ss" },
  { label: "10 хвилин", minutes: 10, format: "HH:mm:ss" },
  { label: "30 хвилин", minutes: 30, format: "HH:mm" },
  { label: "1 година", minutes: 60, format: "HH:mm" },
  { label: "3 години", minutes: 180, format: "HH:mm" },
  { label: "6 годин", minutes: 360, format: "HH:mm" },
  { label: "12 годин", minutes: 720, format: "HH:mm" },
  { label: "1 день", minutes: 1440, format: "HH:mm" },
] as const;

type PeriodOption = (typeof PERIOD_OPTIONS)[number];

export default function SensorGraphDHT21() {
  const [historicalData, setHistoricalData] = useState<SensorPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(
    PERIOD_OPTIONS[0]
  );
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedSensors, setSelectedSensors] = useState<string[]>([
    ...SENSOR_IDS,
  ]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = new URL("/api/humidity-readings", window.location.origin);
        url.searchParams.set("startDate", selectedDate);
        url.searchParams.set("endDate", endDate);

        const response = await fetch(url.toString(), { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }

        const readings = await response.json();
        console.log("Readings: ============", readings);
        setHistoricalData(readings);
        setLastUpdate(new Date());
      } catch (e) {
        console.error("Failed to fetch sensor data:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [selectedDate, endDate]);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      day: selectedPeriod.format.includes("dd") ? "2-digit" : undefined,
      month: selectedPeriod.format.includes("MM") ? "2-digit" : undefined,
    });
  };

  const aggregateData = (data: SensorPoint[]): ChartDataPoint[] => {
    if (selectedPeriod.minutes === 0) {
      return _.map(data, (point) => ({
        ...point,
        time: formatTime(point.timestamp),
      }));
    }

    const intervalMs = selectedPeriod.minutes * 60 * 1000;

    // Сортируем данные по времени
    const sortedData = _.sortBy(data, "timestamp");

    // Берем первую точку и затем каждую N-ю точку
    return _.chain(sortedData)
      .filter(
        (point, index) => index === 0 || index % selectedPeriod.minutes === 0
      )
      .map((point) => ({
        ...point,
        time: formatTime(point.timestamp),
      }))
      .value();
  };

  const formatData = (): ChartDataPoint[] => {
    console.log("Starting data formatting with period:", selectedPeriod);
    const result = aggregateData(historicalData);
    console.log("Formatted data result:", result);
    return result;
  };

  const data = formatData();

  // Находим максимальные значения с небольшим запасом
  const maxHumidity = Math.ceil((_.max(_.flatMap(data, point => 
    SENSOR_IDS.map(id => point[`${id}_humidity`] as number || 0)
  )) || 100) * 1.1);

  const maxTemperature = Math.ceil((_.max(_.flatMap(data, point => 
    SENSOR_IDS.map(id => point[`${id}_temperature`] as number || 0)
  )) || 50) * 1.1);

  console.log('Max values:', { maxHumidity, maxTemperature });

  const downloadCSV = (sensorId: string) => {
    const filtered = historicalData.filter((d) => d.sensor_id === sensorId);
    if (!filtered.length) {
      console.warn(`No data available for ${sensorId}`);
      return alert(`Немає даних для ${sensorId}`);
    }

    const header = "Час,Температура,Вологість";
    const rows = filtered.map(
      (d) =>
        `${formatTime(d.timestamp)},${d.temperature.toFixed(
          1
        )},${d.humidity.toFixed(1)}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sensorId}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`Exported CSV for ${sensorId} with ${filtered.length} records`);
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

  return (
    <div
      className="container-fluid py-4"
      style={{ backgroundColor: "#2b2b2b", color: "#fff", borderRadius: 5 }}
    >
      <div className="d-flex flex-wrap gap-3 mb-3 align-items-center justify-content-between">
        <h5 className="text-warning mb-0">
          Графік DHT21 (Температура/Вологість)
        </h5>
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
                  console.log(
                    `${id} ${e.target.checked ? "enabled" : "disabled"}`
                  );
                }}
              />
              {id}
            </label>
          ))}
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              console.log(`Start date changed to ${e.target.value}`);
            }}
            max={endDate}
          />
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              console.log(`End date changed to ${e.target.value}`);
            }}
            min={selectedDate}
            max={new Date().toISOString().split("T")[0]}
          />
          <select
            className="form-select"
            value={selectedPeriod.label}
            onChange={(e) => {
              const period =
                PERIOD_OPTIONS.find((p) => p.label === e.target.value) ||
                PERIOD_OPTIONS[0];
              setSelectedPeriod(period);
              console.log(`Period changed to ${period.label}`);
            }}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
          {SENSOR_IDS.map((id) => (
            <button
              key={id}
              className="btn btn-outline-light btn-sm"
              onClick={() => downloadCSV(id)}
            >
              CSV {id}
            </button>
          ))}
        </div>
      </div>

      <div className="text-warning mb-3">
        Оновлено: {lastUpdate.toLocaleTimeString()} | Вибраний період:{" "}
        {new Date(selectedDate).toLocaleDateString("uk-UA")} -{" "}
        {new Date(endDate).toLocaleDateString("uk-UA")}
      </div>

      <div className="d-flex flex-wrap gap-3 mb-3">
        {selectedSensors.map((sensorId) => (
          <React.Fragment key={sensorId}>
            <div style={{ color: COLORS[`${sensorId}_humidity` as ColorKey] }}>
              {sensorId} Вологість
            </div>
            <div
              style={{ color: COLORS[`${sensorId}_temperature` as ColorKey] }}
            >
              {sensorId} Температура
            </div>
          </React.Fragment>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          height: 400,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "sticky",
            left: 0,
            zIndex: 2,
            backgroundColor: "#2b2b2b",
            paddingRight: "10px",
          }}
        >
          <ResponsiveContainer width={60} height={400}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
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
                domain={[0, maxHumidity]}
                width={60}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
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
                  tick={{ fill: "#999" }}
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
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={`${sensorId}_temperature`}
                      name={`${sensorId} Температура`}
                      stroke={COLORS[`${sensorId}_temperature` as ColorKey]}
                      dot={false}
                      unit="°C"
                    />
                  </React.Fragment>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            position: "sticky",
            right: 0,
            zIndex: 2,
            backgroundColor: "#2b2b2b",
            paddingLeft: "10px",
          }}
        >
          <ResponsiveContainer width={60} height={400}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
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
                domain={[0, maxTemperature]}
                width={60}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
