"use client";

import React, { useEffect, useRef, useState } from "react";
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

// Функция для генерации цветов
const generateColors = (
  sensorIds: readonly string[]
): Record<ColorKey, string> => {
  const colors: Record<string, string> = {};

  // Базовые цвета для влажности (оттенки синего)
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

  // Базовые цвета для температуры (оттенки оранжевого/красного)
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
  { label: "1 година", minutes: 60, format: "HH:mm:ss" },
  { label: "12 годин", minutes: 720, format: "HH:mm" },
  { label: "1 день", minutes: 1440, format: "HH:mm" },
  { label: "1 тиждень", minutes: 10080, format: "dd HH:mm" },
  { label: "1 місяць", minutes: 43200, format: "dd HH:mm" },
  { label: "1 рік", minutes: 525600, format: "dd.MM HH:mm" },
];

export default function SensorGraphDHT21() {
  const [historicalData, setHistoricalData] = useState<SensorPoint[]>([]);
  const [liveData, setLiveData] = useState<Record<string, SensorPoint>>({});
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedSensors, setSelectedSensors] = useState<string[]>([
    ...SENSOR_IDS,
  ]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching data...");
        
        // Вычисляем временной диапазон на основе выбранного периода
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - selectedPeriod.minutes * 60 * 1000);

        const [historicalRes, liveRes] = await Promise.all([
          fetch(`/api/humidity-readings?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&sensorIds=${selectedSensors.join(',')}`, { 
            cache: "no-store" 
          }),
          fetch("/api/humidity", { cache: "no-store" }),
        ]);

        if (!historicalRes.ok || !liveRes.ok) {
          throw new Error(
            `Failed to fetch data: Historical ${historicalRes.status}, Live ${liveRes.status}`
          );
        }

        const readings = await historicalRes.json();
        const live = await liveRes.json();

        console.log("Raw historical data:", readings);
        console.log("Raw live data:", live);

        // Форматируем исторические данные
        const formattedHistorical = _.map(readings, (r) => ({
          sensor_id: r.sensor_id,
          timestamp: new Date(r.timestamp).getTime(),
          humidity: Number(r.humidity),
          temperature: Number(r.temperature),
        }));

        // Форматируем живые данные
        const formattedLive = _.mapValues(live.sensors, (s) => ({
          sensor_id: s.id,
          timestamp: Number(s.timestamp),
          humidity: parseFloat(String(s.humidity)),
          temperature: parseFloat(String(s.temperature)),
        }));

        setHistoricalData(formattedHistorical);
        setLiveData(formattedLive);
        setLastUpdate(new Date());
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "Unknown error occurred";
        console.error("Failed to fetch sensor data:", e);
        console.error("Error details:", {
          message: errorMessage,
          stack: e instanceof Error ? e.stack : undefined,
        });
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
      second: "2-digit",
      hour12: false,
      day: selectedPeriod.format.includes("dd") ? "2-digit" : undefined,
      month: selectedPeriod.format.includes("MM") ? "2-digit" : undefined,
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
        // 1 час
        return date.toISOString();
      } else if (selectedPeriod.minutes <= 720) {
        // 12 часов
        return `${date.getHours()}:${Math.floor(date.getMinutes() / 5) * 5}`;
      } else if (selectedPeriod.minutes <= 1440) {
        // 1 день
        return `${date.getHours()}:${Math.floor(date.getMinutes() / 15) * 15}`;
      } else if (selectedPeriod.minutes <= 10080) {
        // 1 неделя
        return `${date.getDate()} ${date.getHours()}:00`;
      } else if (selectedPeriod.minutes <= 43200) {
        // 1 месяц
        return `${date.getDate()} ${date.getHours()}:00`;
      } else {
        // 1 год
        return `${date.getDate()}.${date.getMonth() + 1} ${date.getHours()}:00`;
      }
    });

    // Преобразуем в формат для графика
    const chartData = _.map(groupedByTime, (points, timeKey) => {
      const dataPoint: ChartDataPoint = {
        timestamp: points[0].timestamp,
        time: formatTime(points[0].timestamp),
      };

      // Вычисляем средние значения для каждой группы
      points.forEach((point) => {
        const humidityKey = `${point.sensor_id}_humidity`;
        const tempKey = `${point.sensor_id}_temperature`;

        if (!dataPoint[humidityKey]) {
          dataPoint[humidityKey] = 0;
        }
        if (!dataPoint[tempKey]) {
          dataPoint[tempKey] = 0;
        }

        dataPoint[humidityKey] =
          (Number(dataPoint[humidityKey]) + point.humidity) / 2;
        dataPoint[tempKey] =
          (Number(dataPoint[tempKey]) + point.temperature) / 2;
      });

      return dataPoint;
    });

    console.log("Chart data:", chartData);
    return _.orderBy(chartData, ["timestamp"], ["asc"]);
  };

  const data = formatData();

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
              console.log(`Date changed to ${e.target.value}`);
            }}
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
        Оновлено: {lastUpdate.toLocaleTimeString()} | Вибрана дата:{" "}
        {new Date(selectedDate).toLocaleDateString("uk-UA")}
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
                domain={[0, 100]}
                ticks={[
                  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75,
                  80, 85, 90, 95, 100,
                ]}
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
                domain={[0, 100]}
                ticks={[
                  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75,
                  80, 85, 90, 95, 100,
                ]}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}