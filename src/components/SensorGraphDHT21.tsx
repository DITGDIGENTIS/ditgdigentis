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

// Определяем тип для параметров линии
interface LineProperties {
  type: "monotone";
  strokeWidth: number;
  connectNulls: boolean;
  dot: boolean | { r: number };
  activeDot: { r: number };
  isAnimationActive?: boolean;
}

export default function SensorGraphDHT21() {
  const [historicalData, setHistoricalData] = useState<SensorPoint[]>([]);
  const [liveData, setLiveData] = useState<Record<string, SensorPoint>>({});
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([
    ...SENSOR_IDS,
  ]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Добавляем константы для шкал
  const DEFAULT_RANGES = {
    humidity: [0, 100],
    temperature: [-10, 50]
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const isToday = selectedDate === new Date().toISOString().split("T")[0];
        const now = new Date();
        
        // Рассчитываем даты для запроса
        let endDate = isToday ? now : new Date(selectedDate);
        if (!isToday) {
          endDate.setHours(23, 59, 59, 999);
        }
        
        // Для часового периода берем чуть больше данных для плавности
        const startDate = new Date(endDate.getTime() - (selectedPeriod.minutes + 5) * 60 * 1000);

        // Оптимизируем параметры запроса
        const queryParams = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          sensorIds: selectedSensors.join(',')
        });

        const [historicalRes, liveRes] = await Promise.all([
          fetch(`/api/humidity-readings?${queryParams}`, {
            cache: "no-store",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }),
          isToday ? fetch("/api/humidity", {
            cache: "no-store",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }) : Promise.resolve(new Response(JSON.stringify({ sensors: {} })))
        ]);

        if (!historicalRes.ok || (isToday && !liveRes.ok)) {
          throw new Error(
            `Failed to fetch data: Historical ${historicalRes.status}${isToday ? `, Live ${liveRes.status}` : ''}`
          );
        }

        const [readings, live] = await Promise.all([
          historicalRes.json(),
          isToday ? liveRes.json() : { sensors: {} }
        ]);

        // Обрабатываем исторические данные
        const formattedHistorical = readings.map((r: any) => ({
          sensor_id: r.sensor_id,
          timestamp: new Date(r.timestamp).getTime(),
          humidity: _.round(Number(r.humidity), 1),
          temperature: _.round(Number(r.temperature), 1),
        }));

        // Обрабатываем живые данные
        const formattedLive = isToday ? 
          Object.entries(live.sensors).reduce((acc: Record<string, SensorPoint>, [id, data]: [string, any]) => {
            acc[id] = {
              sensor_id: data.id,
              timestamp: Number(data.timestamp),
              humidity: _.round(Number(data.humidity), 1),
              temperature: _.round(Number(data.temperature), 1),
            };
            return acc;
          }, {}) : {};

        setHistoricalData(formattedHistorical);
        setLiveData(formattedLive);
      } catch (e) {
        console.error("Failed to fetch sensor data:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Для часового графика обновляем чаще
    const isToday = selectedDate === new Date().toISOString().split("T")[0];
    const updateInterval = selectedPeriod.minutes <= 60 ? 3000 : 15000;
    const interval = isToday ? setInterval(fetchData, updateInterval) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedPeriod, selectedSensors, selectedDate]);

  const getTimeKey = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    // Форматируем время в зависимости от периода для точной аналитики
    switch(selectedPeriod.minutes) {
      case 60: // 1 час
        // Каждые 3 секунды для максимальной точности
        return `${hours}:${minutes}:${Math.floor(date.getSeconds() / 3) * 3}`;
      case 720: // 12 часов
        // Каждые 30 секунд
        return `${hours}:${minutes}:${Math.floor(date.getSeconds() / 30) * 30}`;
      case 1440: // 1 день
        // Каждые 5 минут
        return `${hours}:${Math.floor(date.getMinutes() / 5) * 5}`;
      case 10080: // 1 неделя
        // Каждые 30 минут
        return `${day} ${hours}:${Math.floor(date.getMinutes() / 30) * 30}`;
      case 43200: // 1 месяц
        // Каждые 3 часа
        return `${day} ${Math.floor(date.getHours() / 3) * 3}:00`;
      default: // 1 год
        // По дням
        return `${day}.${month}`;
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    if (selectedPeriod.minutes <= 720) {
      // Для 1 часа и 12 часов показываем секунды
      options.second = "2-digit";
    }
    
    if (selectedPeriod.minutes > 1440) {
      // Для периодов больше суток показываем дату
      options.day = "2-digit";
      if (selectedPeriod.minutes > 43200) {
        // Для месяца и года показываем месяц
        options.month = "2-digit";
      }
    }

    return date.toLocaleString("uk-UA", options);
  };

  // Функция для вычисления диапазонов осей с учетом минимальных значений
  const calculateAxisRanges = (data: ChartDataPoint[]) => {
    if (!data.length) return DEFAULT_RANGES;

    const humidityValues: number[] = [];
    const temperatureValues: number[] = [];

    // Собираем все значения
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

    if (humidityValues.length === 0 || temperatureValues.length === 0) {
      return DEFAULT_RANGES;
    }

    // Находим минимальные и максимальные значения
    const humidityMin = Math.min(...humidityValues);
    const humidityMax = Math.max(...humidityValues);
    const tempMin = Math.min(...temperatureValues);
    const tempMax = Math.max(...temperatureValues);

    // Добавляем отступы для лучшей визуализации
    const humidityPadding = (humidityMax - humidityMin) * 0.1;
    const tempPadding = (tempMax - tempMin) * 0.1;

    // Округляем значения для более красивых шкал
    const roundToNearest = (value: number, step: number) => Math.round(value / step) * step;

    return {
      humidity: [
        Math.max(0, roundToNearest(humidityMin - humidityPadding, 5)),
        Math.min(100, roundToNearest(humidityMax + humidityPadding, 5))
      ],
      temperature: [
        roundToNearest(tempMin - tempPadding, 2),
        roundToNearest(tempMax + tempPadding, 2)
      ]
    };
  };

  const formatData = (): ChartDataPoint[] => {
    const selectedDateStart = new Date(selectedDate);
    selectedDateStart.setHours(0, 0, 0, 0);

    const selectedDateEnd = new Date(selectedDate);
    selectedDateEnd.setHours(23, 59, 59, 999);

    // Определяем период для фильтрации
    let periodEnd = new Date();
    let periodStart = new Date();

    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    if (isToday) {
      // Для текущего дня - от 00:00 до текущего момента
      periodStart = new Date(today);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date();
    } else {
      // Для выбранной даты всегда от 00:00 до 00:00 следующего дня
      periodStart = new Date(selectedDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(selectedDate);
      periodEnd.setDate(periodEnd.getDate() + 1);
      periodEnd.setHours(0, 0, 0, 0);
    }

    // Корректируем период в зависимости от выбранного временного интервала
    if (selectedPeriod.minutes < 1440) { // Меньше суток
      periodEnd = new Date(Math.min(periodEnd.getTime(), new Date().getTime()));
      periodStart = new Date(periodEnd.getTime() - selectedPeriod.minutes * 60 * 1000);
    }

    // Фильтруем и сортируем данные
    const filtered = _.chain(historicalData)
      .filter(d => {
        const timestamp = new Date(d.timestamp).getTime();
        return timestamp >= periodStart.getTime() &&
               timestamp <= periodEnd.getTime() &&
               selectedSensors.includes(d.sensor_id);
      })
      .orderBy(['timestamp'], ['asc'])
      .value();

    // Для часового периода не группируем данные, берем как есть
    if (selectedPeriod.minutes <= 60) {
      return filtered.map(point => ({
        timestamp: point.timestamp,
        time: formatTime(point.timestamp),
        [`${point.sensor_id}_humidity`]: point.humidity,
        [`${point.sensor_id}_temperature`]: point.temperature
      }));
    }

    // Для остальных периодов используем группировку
    const groupedByTime = _.groupBy(filtered, point => getTimeKey(new Date(point.timestamp)));

    return _.map(groupedByTime, (points, timeKey) => {
      const dataPoint: ChartDataPoint = {
        timestamp: points[0].timestamp,
        time: formatTime(points[0].timestamp),
      };

      selectedSensors.forEach(sensorId => {
        const sensorPoints = points.filter(p => p.sensor_id === sensorId);
        if (sensorPoints.length > 0) {
          const humidityValues = sensorPoints.map(p => p.humidity);
          const tempValues = sensorPoints.map(p => p.temperature);

          dataPoint[`${sensorId}_humidity`] = _.round(_.mean(humidityValues), 1);
          dataPoint[`${sensorId}_temperature`] = _.round(_.mean(tempValues), 1);
        }
      });

      return dataPoint;
    });
  };

  // Получаем данные и вычисляем диапазоны
  const chartData = formatData();
  const axisRanges = calculateAxisRanges(chartData);

  const downloadCSV = (sensorId: string) => {
    const filtered = historicalData.filter((d) => d.sensor_id === sensorId);
    if (!filtered.length) {
      console.warn(`No data available for ${sensorId}`);
      return alert(`Немає даних для ${sensorId}`);
    }

    // Добавляем больше информации в CSV для аналитики
    const header = "Дата,Час,Температура,Вологість";
    const rows = filtered.map((d) => {
      const date = new Date(d.timestamp);
      return `${date.toLocaleDateString('uk-UA')},${date.toLocaleTimeString('uk-UA')},${d.temperature.toFixed(2)},${d.humidity.toFixed(2)}`;
    });
    
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sensorId}_${selectedDate}_${selectedPeriod.label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timestamp = payload[0]?.payload?.timestamp;
      const date = timestamp ? new Date(timestamp) : null;
      
      return (
        <div className="bg-dark p-2 border border-secondary rounded">
          {date && (
            <p className="mb-1 text-white">
              {date.toLocaleString('uk-UA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: selectedPeriod.minutes <= 720 ? '2-digit' : undefined,
                hour12: false
              })}
            </p>
          )}
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="mb-0">
              {entry.name}: {entry.value.toFixed(2)}{entry.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Функция для определения параметров отображения линий
  const getLineProps = (): LineProperties => {
    const baseProps = {
      type: "monotone" as const,
      strokeWidth: 2,
      connectNulls: true,
      dot: false,
      activeDot: { r: 4 }
    };

    // Отключаем анимацию только для часового графика
    if (selectedPeriod.minutes === 60) {
      return {
        ...baseProps,
        isAnimationActive: false
      };
    }

    return baseProps;
  };

  // Получаем параметры линий
  const lineProps = getLineProps();

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
            <div key={id} className="form-check form-check-inline">
              <input
                type="checkbox"
                className="form-check-input"
                id={`sensor-${id}`}
                checked={selectedSensors.includes(id)}
                onChange={(e) => {
                  const updated = e.target.checked
                    ? [...selectedSensors, id]
                    : selectedSensors.filter((s) => s !== id);
                  setSelectedSensors(updated);
                }}
              />
              <label className="form-check-label text-light" htmlFor={`sensor-${id}`}>
                {id}
              </label>
            </div>
          ))}
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
          <select
            className="form-select"
            value={selectedPeriod.label}
            onChange={(e) => {
              const period = PERIOD_OPTIONS.find((p) => p.label === e.target.value) || PERIOD_OPTIONS[0];
              setSelectedPeriod(period);
            }}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
          {selectedSensors.map((id) => (
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
        Вибрана дата: {new Date(selectedDate).toLocaleDateString("uk-UA")}
        {isLoading && <span className="ms-2">(Завантаження...)</span>}
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

      <div className="chart-wrapper" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <style jsx>{`
          .chart-wrapper {
            position: relative;
            width: 100%;
            height: 400px;
            background-color: #2b2b2b;
            overflow: hidden;
          }
          .chart-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
          }
          .scroll-container {
            flex: 1;
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            margin: 0 40px;
          }
          .scroll-container::-webkit-scrollbar {
            display: none;
          }
          .chart-content {
            position: relative;
            min-width: 100%;
            height: 100%;
          }
          @media (max-width: 768px) {
            .chart-content {
              min-width: 800px;
            }
            .time-label {
              font-size: 12px;
              transform: rotate(-45deg);
              transform-origin: top right;
              white-space: nowrap;
            }
            .y-axis-label {
              font-size: 10px;
            }
          }
          .y-axis-left {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 1000;
            background-color: #2b2b2b;
            width: 40px;
            box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
          }
          .y-axis-right {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            z-index: 1000;
            background-color: #2b2b2b;
            width: 40px;
            box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
          }
          .chart-main {
            position: relative;
            width: 100%;
            height: 100%;
          }
        `}</style>

        <div className="chart-container">
          <div className="y-axis-left">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
              width={40}
              height={400}
            >
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#44c0ff"
                tick={{ fill: "#44c0ff", fontSize: 10 }}
                label={{
                  value: "Вологість (%)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#44c0ff",
                  style: { fontSize: "10px" },
                  className: "y-axis-label"
                }}
                domain={axisRanges.humidity}
                allowDataOverflow={true}
                tickCount={6}
                tickFormatter={(value) => `${value}%`}
                scale="linear"
                allowDecimals={true}
                tickMargin={5}
                width={40}
                axisLine={{ stroke: "#44c0ff" }}
                tickLine={{ stroke: "#44c0ff" }}
              />
            </LineChart>
          </div>

          <div className="scroll-container">
            <div className="chart-content">
              <div className="chart-main">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                      dataKey="time"
                      stroke="#999"
                      tick={{ fill: "#999", className: "time-label" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={selectedPeriod.minutes <= 60 ? 2 : "preserveStartEnd"}
                      minTickGap={selectedPeriod.minutes <= 720 ? 15 : 30}
                    />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      domain={axisRanges.humidity}
                      hide={true}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={axisRanges.temperature}
                      hide={true}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      wrapperStyle={{
                        backgroundColor: "#2b2b2b",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        padding: "8px",
                        zIndex: 1001
                      }}
                    />
                    {selectedSensors.map((sensorId) => (
                      <React.Fragment key={sensorId}>
                        <Line
                          yAxisId="left"
                          type={lineProps.type}
                          dataKey={`${sensorId}_humidity`}
                          name={`${sensorId} Вологість`}
                          stroke={COLORS[`${sensorId}_humidity` as ColorKey]}
                          dot={lineProps.dot}
                          activeDot={lineProps.activeDot}
                          unit="%"
                          strokeWidth={lineProps.strokeWidth}
                          connectNulls={lineProps.connectNulls}
                          isAnimationActive={lineProps.isAnimationActive}
                        />
                        <Line
                          yAxisId="right"
                          type={lineProps.type}
                          dataKey={`${sensorId}_temperature`}
                          name={`${sensorId} Температура`}
                          stroke={COLORS[`${sensorId}_temperature` as ColorKey]}
                          dot={lineProps.dot}
                          activeDot={lineProps.activeDot}
                          unit="°C"
                          strokeWidth={lineProps.strokeWidth}
                          connectNulls={lineProps.connectNulls}
                          isAnimationActive={lineProps.isAnimationActive}
                        />
                      </React.Fragment>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="y-axis-right">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
              width={40}
              height={400}
            >
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ffa500"
                tick={{ fill: "#ffa500", fontSize: 10 }}
                label={{
                  value: "Температура (°C)",
                  angle: 90,
                  position: "insideRight",
                  fill: "#ffa500",
                  style: { fontSize: "10px" },
                  className: "y-axis-label"
                }}
                domain={axisRanges.temperature}
                allowDataOverflow={true}
                tickCount={6}
                tickFormatter={(value) => `${value}°C`}
                scale="linear"
                allowDecimals={true}
                tickMargin={5}
                width={40}
                axisLine={{ stroke: "#ffa500" }}
                tickLine={{ stroke: "#ffa500" }}
              />
            </LineChart>
          </div>
        </div>
      </div>
    </div>
  );
}