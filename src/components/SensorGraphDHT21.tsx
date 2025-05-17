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

interface SegmentContext {
  p0: { parsed: { x: number } };
  p1: { parsed: { x: number } };
}

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
    let startTime: Date;
    let endTime: Date;
    
    if (selectedPeriod.hours <= 1) {
      // Округляем текущее время до текущей минуты
      endTime = new Date(now);
      endTime.setSeconds(0, 0);
      
      // Устанавливаем начало ровно на час назад
      startTime = new Date(endTime);
      startTime.setHours(endTime.getHours() - 1);
      
      console.log("[updateTimeRange 1h]", {
        period: "1 час",
        start: startTime.toLocaleTimeString(),
        end: endTime.toLocaleTimeString()
      });
    } else if (selectedPeriod.hours <= 12) {
      endTime = new Date(now);
      startTime = new Date(endTime);
      
      if (now.getHours() < 12) {
        startTime.setHours(0, 0, 0, 0);
        endTime.setHours(12, 0, 0, 0);
      } else {
        startTime.setHours(12, 0, 0, 0);
        endTime.setHours(24, 0, 0, 0);
      }
      setTimeRange({ start: startTime, end: endTime });
    } else if (selectedPeriod.hours <= 24) {
      endTime = new Date(now);
      startTime = new Date(endTime);
      startTime.setHours(0, 0, 0, 0);
      endTime.setHours(23, 59, 59, 999);
      setTimeRange({ start: startTime, end: endTime });
    } else if (selectedPeriod.hours <= 24 * 7) {
      endTime = new Date(now);
      startTime = new Date(endTime);
      startTime.setDate(startTime.getDate() - 7);
      startTime.setHours(0, 0, 0, 0);
      endTime.setHours(23, 59, 59, 999);
      setTimeRange({ start: startTime, end: endTime });
    } else if (selectedPeriod.hours <= 24 * 30) {
      endTime = new Date(now);
      startTime = new Date(endTime);
      startTime.setMonth(startTime.getMonth() - 1);
      startTime.setHours(0, 0, 0, 0);
      endTime.setHours(23, 59, 59, 999);
      setTimeRange({ start: startTime, end: endTime });
    } else {
      endTime = new Date(now);
      startTime = new Date(endTime);
      startTime.setFullYear(startTime.getFullYear() - 1);
      startTime.setHours(0, 0, 0, 0);
      endTime.setHours(23, 59, 59, 999);
      setTimeRange({ start: startTime, end: endTime });
    }
  }, [selectedPeriod.hours]);

  useEffect(() => {
    updateTimeRange();
  }, [selectedPeriod, updateTimeRange]);

  const fetchData = useCallback(async () => {
    try {
      if (!timeRange) {
        updateTimeRange();
        return;
      }

      // Для отладки
      console.log("[fetchData] Запрос данных:", {
        startDate: timeRange.start.toLocaleString(),
        endDate: timeRange.end.toLocaleString(),
        intervalSeconds: selectedPeriod.intervalSeconds,
        sensorIds: SENSOR_IDS
      });

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
        console.error("[fetchData] Ошибка ответа:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Ошибка получения данных: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const readings = await response.json();
      
      // Для отладки
      console.log("[fetchData] Получены данные:", {
        count: readings.length,
        firstPoint: readings[0],
        lastPoint: readings[readings.length - 1]
      });

      if (!Array.isArray(readings) || readings.length === 0) {
        console.warn("[fetchData] Нет данных в ответе");
        return;
      }

      if (selectedPeriod.hours <= 1) {
        // Для часового периода берем все точки как есть
        setData(readings);
        lastDataRef.current = readings;
      } else {
        setData(readings);
        lastDataRef.current = readings;
      }
      
      setError(null);
    } catch (error) {
      console.error("[fetchData] Ошибка:", error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, selectedPeriod.hours, selectedPeriod.intervalSeconds, updateTimeRange]);

  useEffect(() => {
    // Очищаем предыдущий интервал
    if (fetchTimeoutRef.current) {
      clearInterval(fetchTimeoutRef.current);
    }

    // Немедленно запрашиваем данные
    fetchData();

    // Устанавливаем интервал обновления
    const updateInterval = selectedPeriod.hours <= 1 ? 3000 : 5000;
    fetchTimeoutRef.current = setInterval(fetchData, updateInterval);

    return () => {
      if (fetchTimeoutRef.current) {
        clearInterval(fetchTimeoutRef.current);
      }
    };
  }, [fetchData, selectedPeriod.hours]);

  const chartData = useMemo(() => ({
    datasets: [
      {
        label: 'Температура',
        data: data.map(point => ({
          x: point.timestamp,
          y: point.temperature
        })),
        borderColor: 'rgba(255, 214, 2, 0.9)',
        backgroundColor: 'rgba(255, 214, 2, 0.15)',
        yAxisID: 'y1',
        pointRadius: selectedPeriod.hours <= 1 ? 3 : 0,
        pointHoverRadius: 5,
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        spanGaps: true,
        cubicInterpolationMode: 'monotone' as const
      },
      {
        label: 'Влажность',
        data: data.map(point => ({
          x: point.timestamp,
          y: point.humidity
        })),
        borderColor: 'rgba(68, 192, 255, 0.9)',
        backgroundColor: 'rgba(68, 192, 255, 0.15)',
        yAxisID: 'y2',
        pointRadius: selectedPeriod.hours <= 1 ? 3 : 0,
        pointHoverRadius: 5,
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        spanGaps: true,
        cubicInterpolationMode: 'monotone' as const
      }
    ]
  }), [data, selectedPeriod.hours]);

  const generateHourLabels = useCallback(() => {
    if (!timeRange) return [];
    const { start, end } = timeRange;
    const labels = [];
    const current = new Date(start);
    
    while (current <= end) {
      labels.push(new Date(current));
      current.setMinutes(current.getMinutes() + 5);
    }
    
    return labels;
  }, [timeRange]);

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeOutQuart'
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
        top: 40,
        right: 30,
        bottom: 30,
        left: 30
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          stepSize: 1,
          displayFormats: {
            minute: 'HH:mm:ss'
          },
          tooltipFormat: 'HH:mm:ss'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
          lineWidth: 1,
          display: true,
          drawTicks: true,
          offset: false
        },
        border: {
          color: 'rgba(255, 255, 255, 0.2)',
          width: 2,
          dash: [4, 4]
        },
        min: timeRange?.start.getTime(),
        max: timeRange?.end.getTime(),
        ticks: {
          source: 'data',
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 40,
          maxTicksLimit: 20,
          font: {
            size: 12,
            weight: 500
          },
          padding: 8,
          color: 'rgba(255, 255, 255, 0.8)',
          callback: function(value) {
            const date = new Date(Number(value));
            return date.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit',
              hour12: false 
            });
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(255, 214, 2, 0.08)',
          drawOnChartArea: true,
          drawTicks: true,
          lineWidth: 1
        },
        border: {
          color: 'rgba(255, 214, 2, 0.3)',
          width: 2,
          dash: [4, 4]
        },
        ticks: {
          color: 'rgba(255, 214, 2, 0.9)',
          font: {
            size: 20,
            weight: 500
          },
          padding: 20,
          stepSize: 10,
          callback: function(value) {
            return value + '°C';
          }
        },
        title: {
          display: true,
          text: 'Температура',
          color: 'rgba(255, 214, 2, 0.9)',
          font: {
            size: 24,
            weight: 600
          },
          padding: { top: 0, bottom: 20 }
        }
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(68, 192, 255, 0.08)',
          drawOnChartArea: false,
          drawTicks: true,
          lineWidth: 1
        },
        border: {
          color: 'rgba(68, 192, 255, 0.3)',
          width: 2,
          dash: [4, 4]
        },
        ticks: {
          color: 'rgba(68, 192, 255, 0.9)',
          font: {
            size: 20,
            weight: 500
          },
          padding: 20,
          stepSize: 10,
          callback: function(value) {
            return value + '%';
          }
        },
        title: {
          display: true,
          text: 'Влажность',
          color: 'rgba(68, 192, 255, 0.9)',
          font: {
            size: 24,
            weight: 600
          },
          padding: { top: 0, bottom: 20 }
        }
      }
    },
    plugins: {
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        padding: {
          top: 15,
          right: 18,
          bottom: 15,
          left: 18
        },
        titleFont: {
          size: 18,
          weight: 600
        },
        bodyFont: {
          size: 16,
          weight: 500
        },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
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
          color: 'rgba(255, 255, 255, 0.9)',
          padding: 25,
          font: {
            size: 20,
            weight: 500
          },
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8
        }
      }
    }
  }), [selectedPeriod.hours, timeRange]);

  const chartStyleOverrides = useMemo(() => ({
    maintainAspectRatio: false,
    responsive: true,
    layout: {
      padding: {
        top: 15,
        right: 25,
        bottom: 5,
        left: 25
      }
    },
    scales: {
      y1: {
        border: {
          display: false
        },
        grid: {
          color: 'rgba(255, 214, 2, 0.06)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 14,
            weight: 400
          }
        },
        title: {
          font: {
            size: 16,
            weight: 400
          }
        }
      },
      y2: {
        border: {
          display: false
        },
        grid: {
          color: 'rgba(68, 192, 255, 0.06)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 14,
            weight: 400
          }
        },
        title: {
          font: {
            size: 16,
            weight: 400
          }
        }
      },
      x: {
        border: {
          display: false
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 14,
            weight: 400
          }
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          font: {
            size: 14,
            weight: 400
          }
        }
      }
    }
  }), []);

  // Проверяем наличие данных для отображения
  const hasData = data.length > 0;

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-8">
        <select
          className="w-full sm:w-auto min-w-[200px] px-4 sm:px-6 py-2.5 sm:py-3.5 text-base sm:text-lg font-normal
            bg-white/5 hover:bg-white/10 
            text-white/90 
            border-2 border-white/10 hover:border-white/20
            rounded-xl sm:rounded-2xl transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-white/20
            backdrop-blur-xl shadow-lg"
          value={selectedPeriod.value}
          onChange={(e) => {
            const period = PERIOD_OPTIONS.find(p => p.value === e.target.value);
            if (period) setSelectedPeriod(period);
          }}
        >
          {PERIOD_OPTIONS.map(period => (
            <option key={period.value} value={period.value} className="bg-gray-900">
              {period.label}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full bg-black/30 backdrop-blur-xl rounded-3xl shadow-xl">
        <div className="relative w-full">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black/30 via-black/10 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black/30 via-black/10 to-transparent z-10 pointer-events-none" />
          
          <div className="w-full overflow-x-auto overflow-y-hidden hide-scrollbar">
            <div className="min-w-[800px] w-full h-[85vh] min-h-[600px] px-6">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-3xl transition-opacity duration-300">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-white/90 border-r-white/40 border-b-white/20 border-l-white/40 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                    </div>
                    <span className="text-white/80 text-lg sm:text-xl font-normal animate-pulse">Загрузка данных...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-3xl">
                  <div className="flex flex-col items-center gap-4 text-center px-6 max-w-md">
                    <span className="text-red-400/90 text-lg sm:text-xl font-normal">{error}</span>
                    <button 
                      onClick={() => fetchData()}
                      className="mt-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-white/10 hover:bg-white/15 rounded-xl text-white/90 text-base sm:text-lg font-normal 
                        transition-all duration-200 hover:scale-105 active:scale-95
                        border border-white/10 hover:border-white/20
                        focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      Повторить загрузку
                    </button>
                  </div>
                </div>
              ) : !hasData ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-3xl">
                  <div className="flex flex-col items-center gap-4 text-center px-6 max-w-md">
                    <span className="text-white/80 text-lg sm:text-xl font-normal">Нет данных за выбранный период</span>
                    <button 
                      onClick={() => fetchData()}
                      className="mt-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-white/10 hover:bg-white/15 rounded-xl text-white/90 text-base sm:text-lg font-normal 
                        transition-all duration-200 hover:scale-105 active:scale-95
                        border border-white/10 hover:border-white/20
                        focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      Обновить данные
                    </button>
                  </div>
                </div>
              ) : (
                <Line 
                  data={chartData}
                  options={options}
                  ref={chartRef}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Обновленные стили для скроллбара */}
      <style jsx global>{`
        /* Базовые стили для контейнера с прокруткой */
        .hide-scrollbar {
          overflow-x: auto !important;
          overflow-y: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          scrollbar-width: thin !important;
          scrollbar-color: rgba(255, 255, 255, 0.15) transparent !important;
          max-width: 100vw !important;
          position: relative !important;
        }
        
        /* Стили для Webkit (Chrome, Safari, новый Edge) */
        .hide-scrollbar::-webkit-scrollbar {
          height: 8px !important;
          background: transparent !important;
          width: auto !important;
        }
        
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15) !important;
          border-radius: 8px !important;
          transition: background-color 0.2s ease !important;
        }
        
        .hide-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3) !important;
        }
        
        .hide-scrollbar::-webkit-scrollbar-thumb:active {
          background: rgba(255, 255, 255, 0.4) !important;
        }
        
        .hide-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1) !important;
          border-radius: 8px !important;
        }

        /* Стили для графика */
        canvas {
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
        }

        /* Стили для мобильных устройств */
        @media (max-width: 800px) {
          .hide-scrollbar {
            overflow-x: scroll !important;
            -webkit-overflow-scrolling: touch !important;
          }
          
          .hide-scrollbar > div {
            min-width: 800px !important;
            width: 800px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default SensorGraphDHT21;