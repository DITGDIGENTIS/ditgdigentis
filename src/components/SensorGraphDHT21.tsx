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
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else if (selectedPeriod.minutes <= 10080) {
      // Для периодов до недели включительно показываем время в формате ДД.ММ ЧЧ:ММ или ЧЧ:ММ
      const hours = date.getHours().toString().padStart(2, '0');
      
      if (selectedPeriod.minutes === 10080) {
        // Для недели показываем только часы
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month} ${hours}:00`;
      }
      
      // Для остальных периодов показываем минуты
      const minutes = Math.floor(date.getMinutes() / 5) * 5;
      const timeStr = `${hours}:${minutes.toString().padStart(2, '0')}`;
      
      if (selectedPeriod.minutes > 1440) {
        // Для периодов больше суток добавляем дату
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month} ${timeStr}`;
      }
      return timeStr;
    } else if (selectedPeriod.minutes === 43200) {
      // Для месяца показываем дату и часы
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      return `${day}.${month} ${hours}:00`;
    } else {
      // Для года показываем только дату
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}.${month}`;
    }
  };

  // Мемоизируем функцию форматирования данных
  const formatData = useCallback((): ChartDataPoint[] => {
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
      periodStart = new Date(today);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date();
    } else {
      periodStart = new Date(selectedDate);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(selectedDate);
      periodEnd.setDate(periodEnd.getDate() + 1);
      periodEnd.setHours(0, 0, 0, 0);
    }

    // Корректируем период в зависимости от выбранного временного интервала
    if (selectedPeriod.minutes === 60) {
      // Для часового периода
      periodEnd = new Date();
      // Округляем конец периода до ближайших 5 секунд
      periodEnd.setMilliseconds(0);
      periodEnd.setSeconds(Math.ceil(periodEnd.getSeconds() / 5) * 5);
      
      // Начало периода ровно час назад
      periodStart = new Date(periodEnd.getTime() - 60 * 60 * 1000);
      // Округляем начало периода до ближайших 5 секунд
      periodStart.setMilliseconds(0);
      periodStart.setSeconds(Math.floor(periodStart.getSeconds() / 5) * 5);
    } else if (selectedPeriod.minutes <= 10080) {
      // Для периодов до недели включительно
      periodEnd = new Date(Math.min(periodEnd.getTime(), new Date().getTime()));
      if (selectedPeriod.minutes <= 1440) {
        // Для периодов до суток
        periodStart = new Date(periodEnd.getTime());
        periodStart.setMinutes(periodStart.getMinutes() - selectedPeriod.minutes);
        // Округляем до ближайших 5 минут
        periodStart.setMinutes(Math.floor(periodStart.getMinutes() / 5) * 5);
        periodStart.setSeconds(0);
        periodEnd.setMinutes(Math.ceil(periodEnd.getMinutes() / 5) * 5);
        periodEnd.setSeconds(0);
      } else {
        // Для недели
        periodStart = new Date(periodEnd.getTime() - selectedPeriod.minutes * 60 * 1000);
        // Округляем до часов для недели
        periodStart.setMinutes(0);
        periodStart.setSeconds(0);
        periodEnd.setMinutes(0);
        periodEnd.setSeconds(0);
      }
    } else {
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

    if (selectedPeriod.minutes === 60) {
      // Для часового периода группируем по 5 секунд
      const groupedByTime = _.groupBy(filtered, point => {
        const date = new Date(point.timestamp);
        date.setMilliseconds(0);
        const seconds = Math.floor(date.getSeconds() / 5) * 5;
        date.setSeconds(seconds);
        return date.getTime();
      });

      return _.map(groupedByTime, (points, timeKey) => {
        const timestamp = Number(timeKey);
        const date = new Date(timestamp);
        const showLabel = date.getMinutes() % 5 === 0 && date.getSeconds() === 0;

        const dataPoint: ChartDataPoint = {
          timestamp,
          time: showLabel ? formatTime(timestamp) : '',
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
    } else if (selectedPeriod.minutes <= 10080) {
      const groupedByTime = _.groupBy(filtered, point => {
        const date = new Date(point.timestamp);
        if (selectedPeriod.minutes === 10080) {
          // Для недели группируем по часам
          date.setMinutes(0);
          date.setSeconds(0);
        } else {
          // Для остальных периодов по 5 минут
          const minutes = Math.floor(date.getMinutes() / 5) * 5;
          date.setMinutes(minutes);
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
    } else if (selectedPeriod.minutes === 43200) {
      // Для месяца группируем по 12 часов
      const groupedByTime = _.groupBy(filtered, point => {
        const date = new Date(point.timestamp);
        date.setHours(Math.floor(date.getHours() / 12) * 12);
        date.setMinutes(0);
        date.setSeconds(0);
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
    } else {
      // Для года группируем по 5 дней
      const groupedByTime = _.groupBy(filtered, point => {
        const date = new Date(point.timestamp);
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const groupDay = Math.floor(dayOfYear / 5) * 5;
        const resultDate = new Date(startOfYear.getTime() + groupDay * 24 * 60 * 60 * 1000);
        resultDate.setHours(0, 0, 0, 0);
        return resultDate.getTime();
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
    }
  }, [historicalData, liveData, selectedPeriod, selectedSensors, selectedDate]);

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
  const getLineProps = useCallback((): LineProperties => {
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
              min-width: ${selectedPeriod.minutes === 60 ? '2000px' : (selectedPeriod.minutes >= 10080 ? '3000px' : '1200px')};
            }
            .time-label {
              font-size: ${selectedPeriod.minutes >= 10080 ? '14px' : '12px'};
              transform: rotate(-45deg);
              transform-origin: top right;
              white-space: nowrap;
            }
            .y-axis-label {
              font-size: 10px;
            }
          }
          @media (min-width: 769px) {
            .chart-content {
              min-width: ${selectedPeriod.minutes === 60 ? '1800px' : (selectedPeriod.minutes >= 10080 ? '2400px' : '100%')};
            }
            .time-label {
              font-size: ${selectedPeriod.minutes >= 10080 ? '14px' : '12px'};
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
          .zoom-button {
            position: absolute;
            top: 10px;
            right: 50px;
            z-index: 1000;
            background-color: rgba(255, 255, 255, 0.2);
            border: 1px solid #666;
            color: #fff;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
          }
          .zoom-button:hover {
            background-color: rgba(255, 255, 255, 0.3);
          }
        `}</style>

        <button className="zoom-button" onClick={zoomOut}>
          Сбросить масштаб
        </button>

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
                    margin={{ top: 5, right: 5, left: 5, bottom: 25 }}
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
                        className: "time-label",
                        fontSize: window.innerWidth <= 768 ? 10 : 12
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
                        backgroundColor: "#2b2b2b",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        padding: "8px",
                        zIndex: 1001
                      }}
                    />
                    <Brush
                      dataKey="time"
                      height={30}
                      stroke="#666"
                      fill="#2b2b2b"
                      tickFormatter={(time) => time}
                      startIndex={Math.max(0, chartData.length - (selectedPeriod.minutes === 60 ? 60 : 30))}
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