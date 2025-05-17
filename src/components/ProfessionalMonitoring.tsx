"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import { format, subHours, differenceInHours, addHours } from 'date-fns';
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

interface SensorData {
  sensor_id: string;
  timestamp: number;
  humidity: number;
  temperature: number;
}

interface Statistics {
  temperature: {
    current: number;
    min: number;
    max: number;
    avg: number;
    trend: 'up' | 'down' | 'stable';
  };
  humidity: {
    current: number;
    min: number;
    max: number;
    avg: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface AlertThresholds {
  temperature: {
    min: number;
    max: number;
  };
  humidity: {
    min: number;
    max: number;
  };
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  temperature: {
    min: 18,
    max: 28,
  },
  humidity: {
    min: 30,
    max: 70,
  },
};

const PERIOD_OPTIONS = [
  { label: "1 час", value: "1h", hours: 1, intervalSeconds: 3 },
  { label: "12 часов", value: "12h", hours: 12, intervalSeconds: 30 },
  { label: "1 день", value: "24h", hours: 24, intervalSeconds: 5 * 60 },
  { label: "1 неделя", value: "1w", hours: 24 * 7, intervalSeconds: 30 * 60 },
  { label: "1 месяц", value: "1m", hours: 24 * 30, intervalSeconds: 3 * 60 * 60 },
  { label: "1 год", value: "1y", hours: 24 * 365, intervalSeconds: 24 * 60 * 60 }
];

export default function ProfessionalMonitoring() {
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [data, setData] = useState<SensorData[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [isMobile, setIsMobile] = useState(false);
  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calculateStatistics = (data: SensorData[]): Statistics => {
    if (data.length === 0) {
      return {
        temperature: { current: 0, min: 0, max: 0, avg: 0, trend: 'stable' },
        humidity: { current: 0, min: 0, max: 0, avg: 0, trend: 'stable' }
      };
    }

    const temperatures = data.map(d => d.temperature);
    const humidities = data.map(d => d.humidity);

    // Calculate trends using the last 10 points
    const lastPoints = data.slice(-10);
    const tempTrend = lastPoints.length > 1 
      ? (lastPoints[lastPoints.length - 1].temperature > lastPoints[0].temperature ? 'up' : 
         lastPoints[lastPoints.length - 1].temperature < lastPoints[0].temperature ? 'down' : 'stable')
      : 'stable';
    
    const humTrend = lastPoints.length > 1
      ? (lastPoints[lastPoints.length - 1].humidity > lastPoints[0].humidity ? 'up' : 
         lastPoints[lastPoints.length - 1].humidity < lastPoints[0].humidity ? 'down' : 'stable')
      : 'stable';

    return {
      temperature: {
        current: temperatures[temperatures.length - 1],
        min: Math.min(...temperatures),
        max: Math.max(...temperatures),
        avg: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
        trend: tempTrend
      },
      humidity: {
        current: humidities[humidities.length - 1],
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        avg: humidities.reduce((a, b) => a + b, 0) / humidities.length,
        trend: humTrend
      }
    };
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const start = new Date(end.getTime() - selectedPeriod.hours * 60 * 60 * 1000);

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
          intervalSeconds: selectedPeriod.intervalSeconds
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения данных: ${response.status}`);
      }

      const readings = await response.json();
      setData(readings);
      setStatistics(calculateStatistics(readings));
    } catch (error) {
      console.error("Error fetching data:", error);
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
        borderColor: '#ffd602',
        backgroundColor: 'rgba(255, 214, 2, 0.1)',
        yAxisID: 'y1',
        pointRadius: (ctx: any) => {
          const value = ctx.raw.y;
          return (value < thresholds.temperature.min || value > thresholds.temperature.max) 
            ? (isMobile ? 3 : 4) 
            : (isMobile ? 1.5 : 2);
        },
        pointBackgroundColor: (ctx: any) => {
          const value = ctx.raw.y;
          return value < thresholds.temperature.min || value > thresholds.temperature.max 
            ? '#ff4444' 
            : '#ffd602';
        },
        borderWidth: isMobile ? 1.5 : 2,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Влажность',
        data: data.map(point => ({
          x: point.timestamp,
          y: point.humidity
        })),
        borderColor: '#44c0ff',
        backgroundColor: 'rgba(68, 192, 255, 0.1)',
        yAxisID: 'y2',
        pointRadius: (ctx: any) => {
          const value = ctx.raw.y;
          return (value < thresholds.humidity.min || value > thresholds.humidity.max)
            ? (isMobile ? 3 : 4)
            : (isMobile ? 1.5 : 2);
        },
        pointBackgroundColor: (ctx: any) => {
          const value = ctx.raw.y;
          return value < thresholds.humidity.min || value > thresholds.humidity.max 
            ? '#ff4444' 
            : '#44c0ff';
        },
        borderWidth: isMobile ? 1.5 : 2,
        fill: true,
        tension: 0.4
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: selectedPeriod.hours <= 1 ? 'minute' : 
                selectedPeriod.hours <= 24 ? 'hour' : 
                selectedPeriod.hours <= 24 * 7 ? 'day' : 'month',
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
          display: !isMobile
        },
        ticks: {
          maxRotation: isMobile ? 45 : 0,
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: isMobile ? 10 : 12
          },
          maxTicksLimit: isMobile ? 6 : 12
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        min: Math.floor(thresholds.temperature.min - 5),
        max: Math.ceil(thresholds.temperature.max + 5),
        grid: {
          color: 'rgba(255, 214, 2, 0.1)',
          display: !isMobile
        },
        ticks: {
          color: '#ffd602',
          font: {
            size: isMobile ? 10 : 12,
            weight: 'bold'
          },
          callback: (value) => `${value}°C`,
          maxTicksLimit: isMobile ? 6 : undefined
        }
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(68, 192, 255, 0.1)',
          display: !isMobile
        },
        ticks: {
          color: '#44c0ff',
          font: {
            size: isMobile ? 10 : 12,
            weight: 'bold'
          },
          callback: (value) => `${value}%`,
          maxTicksLimit: isMobile ? 6 : undefined
        }
      }
    },
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: isMobile ? 12 : 14 },
        bodyFont: { size: isMobile ? 10 : 12 },
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
        position: isMobile ? 'bottom' : 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: { 
            size: isMobile ? 10 : 12 
          },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: isMobile ? 8 : 10
        }
      }
    }
  };

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 p-3 md:p-4 rounded-lg">
          <h3 className="text-base md:text-lg font-semibold text-yellow-400 mb-2">Температура</h3>
          <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Текущая:</span>
              <span className="text-white font-medium">
                {statistics.temperature.current.toFixed(1)}°C
                {statistics.temperature.trend === 'up' && ' ↑'}
                {statistics.temperature.trend === 'down' && ' ↓'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Средняя:</span>
              <span className="text-white font-medium">{statistics.temperature.avg.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Минимум:</span>
              <span className="text-white font-medium">{statistics.temperature.min.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Максимум:</span>
              <span className="text-white font-medium">{statistics.temperature.max.toFixed(1)}°C</span>
            </div>
          </div>
        </div>
        
        <div className="bg-black/20 p-3 md:p-4 rounded-lg">
          <h3 className="text-base md:text-lg font-semibold text-blue-400 mb-2">Влажность</h3>
          <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Текущая:</span>
              <span className="text-white font-medium">
                {statistics.humidity.current.toFixed(1)}%
                {statistics.humidity.trend === 'up' && ' ↑'}
                {statistics.humidity.trend === 'down' && ' ↓'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Средняя:</span>
              <span className="text-white font-medium">{statistics.humidity.avg.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Минимум:</span>
              <span className="text-white font-medium">{statistics.humidity.min.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Максимум:</span>
              <span className="text-white font-medium">{statistics.humidity.max.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-3 md:space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0">
        <h2 className="text-lg md:text-xl font-semibold text-white">Профессиональный мониторинг</h2>
        <select
          className="w-full md:w-auto bg-black/20 text-white border border-white/20 rounded px-2 md:px-3 py-1 text-sm md:text-base"
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

      {renderStatistics()}

      <div className="w-full h-[300px] md:h-[500px] bg-black/20 rounded-lg p-2 md:p-4">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white text-sm md:text-base">Загрузка данных...</span>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-red-500 text-sm md:text-base">{error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white text-sm md:text-base">Нет данных за выбранный период</span>
          </div>
        ) : (
          <Line data={chartData} options={options} ref={chartRef} />
        )}
      </div>
    </div>
  );
} 