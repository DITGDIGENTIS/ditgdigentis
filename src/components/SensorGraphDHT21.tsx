"use client";

import React, { useEffect, useState, useRef } from 'react';
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

export default function SensorGraphDHT21() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[0]);
  const [data, setData] = useState<SensorPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<ChartJS<'line'>>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const start = new Date(end.getTime() - selectedPeriod.hours * 60 * 60 * 1000);

      console.log("[fetchData] Запрос данных:", {
        период: selectedPeriod.label,
        интервал: `${selectedPeriod.intervalSeconds} секунд`,
        начало: start.toLocaleString(),
        конец: end.toLocaleString()
      });

      const response = await fetch('/api/humidity-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          sensorIds: SENSOR_IDS,
          intervalSeconds: selectedPeriod.intervalSeconds
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка получения данных: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const readings = await response.json();
      
      console.log("[fetchData] Получены данные:", {
        количество: readings.length,
        первая_запись: readings[0],
        последняя_запись: readings[readings.length - 1]
      });

      setData(readings);
    } catch (error) {
      console.error("[fetchData] Ошибка:", error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const chartData = {
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
        pointRadius: 2,
        borderWidth: 2,
        fill: true,
        tension: 0.4
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
        pointRadius: 2,
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    hover: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: selectedPeriod.hours <= 1 ? 'minute' : 
                selectedPeriod.hours <= 24 ? 'hour' : 
                selectedPeriod.hours <= 24 * 7 ? 'day' : 
                selectedPeriod.hours <= 24 * 30 ? 'day' : 'month',
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
        },
        ticks: {
          maxRotation: 0,
          autoSkip: false,
          maxTicksLimit: selectedPeriod.hours <= 1 ? 12 : 
                        selectedPeriod.hours <= 12 ? 24 :
                        selectedPeriod.hours <= 24 ? 24 : 12,
          font: {
            size: 12
          },
          callback: function(value) {
            const date = new Date(value);
            const minutes = date.getMinutes();
            const hours = date.getHours();

            if (selectedPeriod.hours <= 1) {
              return minutes % 5 === 0 ? format(date, 'HH:mm') : '';
            } else if (selectedPeriod.hours <= 12) {
              return minutes === 0 || minutes === 30 ? format(date, 'HH:mm') : '';
            } else if (selectedPeriod.hours <= 24) {
              return minutes === 0 ? format(date, 'HH:mm') : '';
            } else if (selectedPeriod.hours <= 24 * 7) {
              return minutes === 0 && hours % 6 === 0 ? format(date, 'dd.MM HH:mm') : '';
            } else if (selectedPeriod.hours <= 24 * 30) {
              return hours === 0 && minutes === 0 ? format(date, 'dd.MM') : '';
            } else {
              return hours === 0 && minutes === 0 ? format(date, 'dd.MM') : '';
            }
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 15,
        max: 30,
        grid: {
          color: 'rgba(255, 214, 2, 0.1)'
        },
        ticks: {
          color: '#ffd602',
          font: {
            size: 12,
            weight: 'bold'
          },
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
          color: 'rgba(68, 192, 255, 0.1)'
        },
        ticks: {
          color: '#44c0ff',
          font: {
            size: 12,
            weight: 'bold'
          },
          stepSize: 10,
          callback: function(value) {
            return value + '%';
          }
        }
      }
    },
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        },
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
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">График температуры и влажности</h2>
        <select
          className="bg-black/20 text-white border border-white/20 rounded px-3 py-1"
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

      <div className="w-full h-[400px] bg-black/20 rounded-lg p-4">
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
  );
}