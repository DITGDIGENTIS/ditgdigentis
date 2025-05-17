"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { format, subHours } from 'date-fns';
import { ru } from 'date-fns/locale';
import _ from 'lodash';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

const SENSOR_IDS = ['HUM1-1'] as const;

interface SensorPoint {
  sensor_id: string;
  timestamp: number;
  humidity: number;
  temperature: number;
}

type SensorId = (typeof SENSOR_IDS)[number];

interface PeriodOption {
  label: string;
  value: string;
  hours: number;
  intervalSeconds: number;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "1 час", value: "1h", hours: 1, intervalSeconds: 3 },
  { label: "12 часов", value: "12h", hours: 12, intervalSeconds: 30 },
  { label: "1 день", value: "24h", hours: 24, intervalSeconds: 5 * 60 },
  { label: "1 неделя", value: "1w", hours: 24 * 7, intervalSeconds: 30 * 60 },
  { label: "1 месяц", value: "1m", hours: 24 * 30, intervalSeconds: 3 * 60 * 60 },
  { label: "1 год", value: "1y", hours: 24 * 365, intervalSeconds: 24 * 60 * 60 }
];

const COLORS = {
  "HUM1-1": {
    temperature: '#ffd602',
    temperatureBg: 'rgba(255, 214, 2, 0.1)',
    humidity: '#44c0ff',
    humidityBg: 'rgba(68, 192, 255, 0.1)'
  }
};

const SensorGraphDHT21 = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[0]);
  const [data, setData] = useState<SensorPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date } | null>(null);
  const chartRef = useRef<ChartJS<'line'>>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastDataRef = useRef<SensorPoint[]>([]);

  const updateTimeRange = useCallback(() => {
    const now = new Date();
    let end = new Date(now);
    let start = new Date(now);

    if (selectedPeriod.hours <= 1) {
      // Для 1 часа - последний час
      start.setHours(start.getHours() - 1);
    } else if (selectedPeriod.hours <= 12) {
      // Для 12 часов - с начала текущего дня или последние 12 часов
      if (now.getHours() < 12) {
        start.setHours(0, 0, 0, 0);
        end.setHours(12, 0, 0, 0);
      } else {
        start.setHours(12, 0, 0, 0);
        end.setHours(24, 0, 0, 0);
      }
    } else if (selectedPeriod.hours <= 24) {
      // Для 24 часов - текущий день
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else if (selectedPeriod.hours <= 24 * 7) {
      // Для недели
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else if (selectedPeriod.hours <= 24 * 30) {
      // Для месяца
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else {
      // Для года
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    console.log("[updateTimeRange]", {
      period: selectedPeriod.label,
      start: start.toLocaleString(),
      end: end.toLocaleString(),
      intervalSeconds: selectedPeriod.intervalSeconds
    });

    setTimeRange({ start, end });
  }, [selectedPeriod]);

  useEffect(() => {
    updateTimeRange();
  }, [selectedPeriod, updateTimeRange]);

  const fetchData = useCallback(async () => {
    try {
      if (!timeRange) {
        updateTimeRange();
        return;
      }

      const response = await fetch('/api/humidity-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          startDate: timeRange.start.toISOString(),
          endDate: timeRange.end.toISOString(),
          sensorIds: SENSOR_IDS,
          intervalSeconds: selectedPeriod.intervalSeconds
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка получения данных: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const readings = await response.json();
      
      // Проверяем, действительно ли данные изменились
      const hasChanges = JSON.stringify(readings) !== JSON.stringify(lastDataRef.current);
      
      if (hasChanges) {
        lastDataRef.current = readings;
        setData(readings);
      }
      
      setError(null);
    } catch (error) {
      console.error("[fetchData] Ошибка:", error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, selectedPeriod.intervalSeconds]);

  useEffect(() => {
    // Очищаем предыдущий таймаут при изменении периода или временного диапазона
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchData();

    // Устанавливаем новый интервал обновления
    fetchTimeoutRef.current = setInterval(() => {
      fetchData();
    }, 5000);

    return () => {
      if (fetchTimeoutRef.current) {
        clearInterval(fetchTimeoutRef.current);
      }
    };
  }, [fetchData]);

  const chartData = useMemo(() => ({
    datasets: [
      {
        label: 'Температура',
        data: data.map(point => ({
          x: point.timestamp,
          y: point.temperature
        })),
        borderColor: COLORS["HUM1-1"].temperature,
        backgroundColor: COLORS["HUM1-1"].temperatureBg,
        yAxisID: 'y1',
        pointRadius: selectedPeriod.hours <= 1 ? 2 : 0.5,
        borderWidth: selectedPeriod.hours <= 1 ? 2 : 1.5,
        fill: true,
        tension: 0.3,
        spanGaps: true,
        cubicInterpolationMode: 'monotone' as const
      },
      {
        label: 'Влажность',
        data: data.map(point => ({
          x: point.timestamp,
          y: point.humidity
        })),
        borderColor: COLORS["HUM1-1"].humidity,
        backgroundColor: COLORS["HUM1-1"].humidityBg,
        yAxisID: 'y2',
        pointRadius: selectedPeriod.hours <= 1 ? 2 : 0.5,
        borderWidth: selectedPeriod.hours <= 1 ? 2 : 1.5,
        fill: true,
        tension: 0.3,
        spanGaps: true,
        cubicInterpolationMode: 'monotone' as const
      }
    ]
  }), [data, selectedPeriod.hours]);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    hover: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    layout: {
      padding: {
        top: 20,
        right: 25,
        bottom: 10,
        left: 25
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: selectedPeriod.hours <= 1 ? 'minute' : 
                selectedPeriod.hours <= 12 ? 'hour' : 
                selectedPeriod.hours <= 24 ? 'hour' : 
                selectedPeriod.hours <= 24 * 7 ? 'day' : 
                selectedPeriod.hours <= 24 * 30 ? 'day' : 'month',
          stepSize: selectedPeriod.hours <= 1 ? 5 : 
                   selectedPeriod.hours <= 12 ? 1 : 
                   selectedPeriod.hours <= 24 ? 2 : 
                   selectedPeriod.hours <= 24 * 7 ? 1 : 
                   selectedPeriod.hours <= 24 * 30 ? 1 : 1,
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'dd.MM',
            month: 'MM.yyyy'
          },
          tooltipFormat: 'dd.MM.yyyy HH:mm:ss'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          display: true,
          drawBorder: true,
          drawOnChartArea: true,
          drawTicks: true,
          lineWidth: 1
        },
        border: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 1
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: selectedPeriod.hours <= 1 ? 6 : 
                        selectedPeriod.hours <= 12 ? 12 :
                        selectedPeriod.hours <= 24 ? 12 : 8,
          font: {
            size: 10
          },
          padding: 8,
          color: 'rgba(255, 255, 255, 0.8)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 15,
        max: 30,
        grid: {
          color: 'rgba(255, 214, 2, 0.1)',
          drawOnChartArea: true,
          drawTicks: true,
          drawBorder: true,
          lineWidth: 1
        },
        border: {
          color: 'rgba(255, 214, 2, 0.2)',
          width: 1
        },
        ticks: {
          color: '#ffd602',
          font: {
            size: 10,
            weight: 'bold'
          },
          padding: 8,
          stepSize: 1,
          callback: function(value) {
            return value + '°C';
          }
        }
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
          color: 'rgba(68, 192, 255, 0.1)',
          drawTicks: true,
          drawBorder: true,
          lineWidth: 1
        },
        border: {
          color: 'rgba(68, 192, 255, 0.2)',
          width: 1
        },
        ticks: {
          color: '#44c0ff',
          font: {
            size: 10,
            weight: 'bold'
          },
          padding: 8,
          stepSize: 10,
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
    plugins: {
      tooltip: {
        mode: 'nearest',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 12,
          weight: 'bold'
        },
        bodyFont: {
          size: 11
        },
        padding: 10,
        displayColors: true,
        callbacks: {
          title: (items) => {
            if (items.length > 0) {
              const date = new Date(items[0].parsed.x);
              return format(date, 'dd MMM, HH:mm:ss', { locale: ru });
            }
            return '';
          }
        }
      },
      legend: {
        display: true,
        position: 'top',
        align: 'center',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12,
            weight: 'bold'
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          boxWidth: 10,
          boxHeight: 10
        }
      }
    }
  }), [selectedPeriod.hours]);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
        <h2 className="text-xl font-semibold text-white text-center sm:text-left">График температуры и влажности</h2>
        <select
          className="w-full sm:w-auto bg-black/20 text-white border border-white/20 rounded px-3 py-2"
          value={selectedPeriod.value}
          onChange={(e) => {
            const period = PERIOD_OPTIONS.find(p => p.value === e.target.value);
            if (period) setSelectedPeriod(period);
          }}
        >
          {PERIOD_OPTIONS.map(period => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full h-screen sm:h-[600px] bg-black/20 rounded-lg p-3 sm:p-6 overflow-hidden">
        <div className="w-full h-full overflow-x-auto overflow-y-hidden">
          <div className="min-w-[800px] sm:min-w-[1200px] h-full">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white">Загрузка данных...</span>
              </div>
            ) : error ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-red-500">{error}</span>
              </div>
            ) : data.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white">Нет данных за выбранный период</span>
              </div>
            ) : (
              <Line data={chartData} options={options} ref={chartRef} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SensorGraphDHT21;