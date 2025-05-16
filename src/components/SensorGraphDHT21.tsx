"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import _ from "lodash";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Brush
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
  { label: "1 година", minutes: 60, groupBySeconds: 3, tickMinutes: 5 },
  { label: "12 годин", minutes: 720, groupBySeconds: 1800, tickMinutes: 30 },
  { label: "1 день", minutes: 1440, groupBySeconds: 300, tickMinutes: 60 },
  { label: "1 тиждень", minutes: 10080, groupBySeconds: 1800, tickHours: 3 },
  { label: "1 місяць", minutes: 43200, groupBySeconds: 10800, tickHours: 6 },
  { label: "1 рік", minutes: 525600, groupByDays: 1, tickDays: 7 }
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

// Добавляем интерфейс для статистических данных
interface Statistics {
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
}

interface StatisticsMap {
  [key: string]: Statistics;
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
  
  // Добавляем состояния для зума
  const [zoomState, setZoomState] = useState({
    refAreaLeft: '',
    refAreaRight: '',
    left: 'dataMin',
    right: 'dataMax',
    top: 'dataMax+1',
    bottom: 'dataMin-1',
    animation: true
  });

  // Добавляем константы для шкал
  const DEFAULT_RANGES = {
    humidity: [0, 100],
    temperature: [-10, 50]
  };

  // Добавляем состояние для статистики
  const [statistics, setStatistics] = useState<StatisticsMap>({});

  // Добавляем функцию форматирования диапазона времени
  const formatTimeRange = useCallback((startTime: number, endTime: number) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };

    if (selectedPeriod.minutes === 60) {
      // Для часового периода показываем часы и минуты
      return `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
    } else if (selectedPeriod.minutes <= 1440) {
      // Для периодов до суток включительно
      return start.toLocaleString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' - ' + end.toLocaleString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // Для более длительных периодов включаем дату
      return start.toLocaleString('uk-UA', formatOptions) + ' - ' + 
             end.toLocaleString('uk-UA', formatOptions);
    }
  }, [selectedPeriod.minutes]);



  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const today = new Date().toISOString().split('T')[0];
        const isToday = selectedDate === today;
        
        // Устанавливаем начало и конец периода
        let startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        let endDate = new Date(selectedDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);

        if (isToday) {
          endDate = new Date();
        }

        // Для часового периода берем последний час
        if (selectedPeriod.minutes === 60) {
          startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        } else if (selectedPeriod.minutes === 720) {
          startDate = new Date(endDate.getTime() - 12 * 60 * 60 * 1000);
        }

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

    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    const updateInterval = selectedPeriod.minutes === 60 ? 3000 : 15000;
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
        // Каждые 5 секунд
        const roundedSeconds = Math.floor(date.getSeconds() / 5) * 5;
        return `${hours}:${minutes}:${roundedSeconds.toString().padStart(2, '0')}`;
      case 720: // 12 часов
        // Каждые 5 минут
        const roundedMinutes12h = Math.floor(date.getMinutes() / 5) * 5;
        return `${hours}:${roundedMinutes12h.toString().padStart(2, '0')}`;
      case 1440: // 1 день
        // Каждые 5 минут
        const roundedMinutes24h = Math.floor(date.getMinutes() / 5) * 5;
        return `${hours}:${roundedMinutes24h.toString().padStart(2, '0')}`;
      case 10080: // 1 неделя
        // Каждый час
        return `${day}.${month} ${hours}:00`;
      case 43200: // 1 месяц
        // Каждые 12 часов
        return `${day}.${month} ${hours}:00`;
      default: // 1 год
        // По 5 дней
        return `${day}.${month}`;
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);

    if (selectedPeriod.minutes === 60) {
      // Для часового периода показываем время в формате ЧЧ:ММ
      const minutes = Math.floor(date.getMinutes() / 5) * 5;
      return `${date.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else if (selectedPeriod.minutes <= 1440) {
      // Для периодов до суток включительно
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = Math.floor(date.getMinutes() / (selectedPeriod.minutes === 720 ? 30 : 5)) * (selectedPeriod.minutes === 720 ? 30 : 5);
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } else if (selectedPeriod.minutes <= 10080) {
      // Для недели
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = Math.floor(date.getMinutes() / 30) * 30;
      return `${day}.${month} ${hours}:${minutes.toString().padStart(2, '0')}`;
    } else if (selectedPeriod.minutes === 43200) {
      // Для месяца
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const hours = Math.floor(date.getHours() / 3) * 3;
      return `${day}.${month} ${hours.toString().padStart(2, '0')}:00`;
    } else {
      // Для года
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}.${month}`;
    }
  };

  // Мемоизируем функцию форматирования данных
  const formatData = useCallback((): ChartDataPoint[] => {
    const filtered = _.chain(historicalData)
      .filter(d => {
        const timestamp = new Date(d.timestamp).getTime();
        return selectedSensors.includes(d.sensor_id);
      })
      .orderBy(['timestamp'], ['asc'])
      .value();

    // Группируем данные в зависимости от периода
    const groupedByTime = _.groupBy(filtered, point => {
      const date = new Date(point.timestamp);
      date.setMilliseconds(0);

      if (selectedPeriod.minutes === 60) {
        // Группировка по 3 секунды
        const seconds = Math.floor(date.getSeconds() / 3) * 3;
        date.setSeconds(seconds);
      } else if (selectedPeriod.minutes === 720) {
        // Группировка по 30 секунд
        date.setSeconds(Math.floor(date.getSeconds() / 30) * 30);
      } else if (selectedPeriod.minutes === 1440) {
        // Группировка по 5 минут
        date.setMinutes(Math.floor(date.getMinutes() / 5) * 5);
        date.setSeconds(0);
      } else if (selectedPeriod.minutes === 10080) {
        // Группировка по 30 минут
        date.setMinutes(Math.floor(date.getMinutes() / 30) * 30);
        date.setSeconds(0);
      } else if (selectedPeriod.minutes === 43200) {
        // Группировка по 3 часа
        date.setHours(Math.floor(date.getHours() / 3) * 3);
        date.setMinutes(0);
        date.setSeconds(0);
      } else {
        // Группировка по дням
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
      }
      return date.getTime();
    });

    return _.map(groupedByTime, (points, timeKey) => {
      const timestamp = Number(timeKey);
      const dataPoint: ChartDataPoint = {
        timestamp,
        time: formatTime(timestamp),
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
  }, [historicalData, selectedPeriod, selectedSensors]);

  // Мемоизируем отформатированные данные
  const chartData = useMemo(() => formatData(), [formatData]);

  // Мемоизируем функцию расчета диапазонов осей
  const calculateAxisRanges = useCallback((data: ChartDataPoint[]) => {
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
  }, []);

  // Мемоизируем диапазоны осей
  const axisRanges = useMemo(() => calculateAxisRanges(chartData), [chartData, calculateAxisRanges]);

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

  // Функция расчета статистики
  const calculateStatistics = useCallback((data: ChartDataPoint[], sensorId: string) => {
    const humidityKey = `${sensorId}_humidity`;
    const tempKey = `${sensorId}_temperature`;
    
    const calculateStatsForKey = (key: string) => {
      const values = data
        .map(point => Number(point[key]))
        .filter(val => !isNaN(val));

      if (values.length === 0) return null;

      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      // Расчет стандартного отклонения
      const squareDiffs = values.map(value => Math.pow(value - avg, 2));
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(avgSquareDiff);

      return {
        min: Math.min(...values),
        max: Math.max(...values),
        avg,
        median,
        stdDev
      };
    };

    return {
      [`${sensorId}_humidity`]: calculateStatsForKey(humidityKey),
      [`${sensorId}_temperature`]: calculateStatsForKey(tempKey)
    };
  }, []);

  // Обновляем статистику при изменении данных
  useEffect(() => {
    const newStats: StatisticsMap = {};
    selectedSensors.forEach(sensorId => {
      const sensorStats = calculateStatistics(chartData, sensorId);
      Object.assign(newStats, sensorStats);
    });
    setStatistics(newStats);
  }, [chartData, selectedSensors, calculateStatistics]);

  // Кастомный тултип с дополнительной статистикой
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timestamp = payload[0]?.payload?.timestamp;
      const date = timestamp ? new Date(timestamp) : null;
      
      return (
        <div className="custom-tooltip">
          <style jsx>{`
            .custom-tooltip {
              background-color: rgba(35, 35, 35, 0.95);
              border: 1px solid #666;
              border-radius: 4px;
              padding: 12px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .tooltip-header {
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #555;
              font-weight: bold;
            }
            .tooltip-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 13px;
            }
            .tooltip-label {
              margin-right: 12px;
              color: #999;
            }
            .tooltip-value {
              font-weight: 500;
            }
          `}</style>
          <div className="tooltip-header text-white">
            {date && date.toLocaleString('uk-UA', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: selectedPeriod.minutes <= 720 ? '2-digit' : undefined,
              hour12: false
            })}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="tooltip-row">
              <span className="tooltip-label" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="tooltip-value" style={{ color: entry.color }}>
                {entry.value.toFixed(2)}{entry.unit}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Функция для определения параметров линий с улучшенной визуализацией
  const getLineProps = useCallback((): LineProperties => {
    const baseProps = {
      type: "monotone" as const,
      strokeWidth: 2,
      connectNulls: true,
      dot: selectedPeriod.minutes >= 10080 ? { r: 2 } : false,
      activeDot: { r: 6, strokeWidth: 1 }
    };

    // Отключаем анимацию только для часового графика
    if (selectedPeriod.minutes === 60) {
      return {
        ...baseProps,
        isAnimationActive: false
      };
    }

    return baseProps;
  }, [selectedPeriod.minutes]);

  // Мемоизируем параметры линий
  const lineProps = useMemo(() => getLineProps(), [selectedPeriod.minutes]);

  // Добавляем функции для управления зумом
  const zoom = () => {
    let { refAreaLeft, refAreaRight } = zoomState;
    
    if (refAreaLeft === refAreaRight || !refAreaRight) {
      setZoomState({
        ...zoomState,
        refAreaLeft: '',
        refAreaRight: ''
      });
      return;
    }

    // Убеждаемся, что left меньше right
    if (Number(refAreaLeft) > Number(refAreaRight)) {
      [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];
    }

    setZoomState({
      ...zoomState,
      refAreaLeft: '',
      refAreaRight: '',
      left: refAreaLeft,
      right: refAreaRight
    });
  };

  const zoomOut = () => {
    setZoomState({
      ...zoomState,
      refAreaLeft: '',
      refAreaRight: '',
      left: 'dataMin',
      right: 'dataMax'
    });
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

      <div className="chart-wrapper">
        <style jsx>{`
          .chart-wrapper {
            position: relative;
            width: 100%;
            height: calc(100vh - 250px);
            min-height: 400px;
            background-color: #2b2b2b;
            overflow: hidden;
            border-radius: 8px;
            border: 1px solid #444;
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
            scrollbar-width: thin;
            scrollbar-color: #666 #2b2b2b;
            margin: 0 40px;
          }
          .scroll-container::-webkit-scrollbar {
            height: 8px;
          }
          .scroll-container::-webkit-scrollbar-track {
            background: #2b2b2b;
            border-radius: 4px;
          }
          .scroll-container::-webkit-scrollbar-thumb {
            background-color: #666;
            border-radius: 4px;
            border: 2px solid #2b2b2b;
          }
          .chart-content {
            position: relative;
            min-width: 100%;
            height: 100%;
          }

          @media (max-width: 768px) {
            .chart-wrapper {
              height: calc(100vh - 200px);
            }
            .chart-content {
              min-width: ${selectedPeriod.minutes === 60 ? '2000px' : (selectedPeriod.minutes >= 10080 ? '3000px' : '1200px')};
            }
            .time-label {
              font-size: 10px;
              transform: rotate(-45deg);
              transform-origin: top right;
            }
            .zoom-button {
              top: 5px;
              right: 45px;
              padding: 4px 8px;
              font-size: 11px;
            }
            .time-range-display {
              font-size: 11px;
              padding: 4px 8px;
            }
          }
          @media (min-width: 769px) {
            .chart-content {
              min-width: ${selectedPeriod.minutes === 60 ? '1800px' : (selectedPeriod.minutes >= 10080 ? '2400px' : '100%')};
            }
            .time-label {
              font-size: 12px;
            }
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
                tick={{ fill: "#44c0ff", fontSize: 11 }}
                label={{
                  value: "Вологість (%)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#44c0ff",
                  style: { fontSize: "12px" }
                }}
                domain={axisRanges.humidity}
                allowDataOverflow={true}
                tickCount={8}
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 5, left: 5, bottom: 40 }}
                  onMouseDown={(e) => e?.activeLabel && setZoomState({ ...zoomState, refAreaLeft: e.activeLabel })}
                  onMouseMove={(e) => e?.activeLabel && zoomState.refAreaLeft && setZoomState({ ...zoomState, refAreaRight: e.activeLabel })}
                  onMouseUp={zoom}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="time"
                    stroke="#999"
                    tick={{ 
                      fill: "#999",
                      className: "time-label"
                    }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    minTickGap={selectedPeriod.minutes === 60 ? 30 : (selectedPeriod.minutes >= 10080 ? 200 : (window.innerWidth <= 768 ? 40 : (selectedPeriod.minutes <= 720 ? 15 : 30)))}
                    tickMargin={selectedPeriod.minutes === 60 ? 15 : (selectedPeriod.minutes >= 10080 ? 35 : (window.innerWidth <= 768 ? 15 : 10))}
                    domain={[zoomState.left, zoomState.right]}
                    allowDataOverflow
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
                      backgroundColor: "rgba(35, 35, 35, 0.95)",
                      border: "1px solid #666",
                      borderRadius: "4px",
                      padding: "8px",
                      zIndex: 1001
                    }}
                  />
                  {selectedSensors.map((sensorId) => (
                    <React.Fragment key={sensorId}>
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey={`${sensorId}_humidity`}
                        name="Вологість"
                        stroke={COLORS[`${sensorId}_humidity` as ColorKey]}
                        strokeWidth={2}
                        dot={selectedPeriod.minutes >= 10080 ? { r: 2 } : false}
                        activeDot={{ r: 6, strokeWidth: 1 }}
                        unit="%"
                        connectNulls={true}
                        isAnimationActive={selectedPeriod.minutes !== 60}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey={`${sensorId}_temperature`}
                        name="Температура"
                        stroke={COLORS[`${sensorId}_temperature` as ColorKey]}
                        strokeWidth={2}
                        dot={selectedPeriod.minutes >= 10080 ? { r: 2 } : false}
                        activeDot={{ r: 6, strokeWidth: 1 }}
                        unit="°C"
                        connectNulls={true}
                        isAnimationActive={selectedPeriod.minutes !== 60}
                      />
                    </React.Fragment>
                  ))}
                  {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                    <ReferenceArea
                      yAxisId="left"
                      x1={zoomState.refAreaLeft}
                      x2={zoomState.refAreaRight}
                      strokeOpacity={0.3}
                      fill="#fff"
                      fillOpacity={0.1}
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
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
                tick={{ fill: "#ffa500", fontSize: 11 }}
                label={{
                  value: "Температура (°C)",
                  angle: 90,
                  position: "insideRight",
                  fill: "#ffa500",
                  style: { fontSize: "12px" }
                }}
                domain={axisRanges.temperature}
                allowDataOverflow={true}
                tickCount={8}
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