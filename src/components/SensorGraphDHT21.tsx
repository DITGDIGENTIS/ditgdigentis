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
import { format, startOfDay, addDays, subHours } from 'date-fns';
import { uk } from 'date-fns/locale';
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
  minutes: number;
  interval: number;
  intervalUnit: 'second' | 'minute' | 'hour' | 'day';
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "1 час", value: "1h", minutes: 60, interval: 3, intervalUnit: 'second' },
  { label: "12 часов", value: "12h", minutes: 720, interval: 30, intervalUnit: 'minute' },
  { label: "1 день", value: "1d", minutes: 1440, interval: 5, intervalUnit: 'minute' },
  { label: "1 неделя", value: "1w", minutes: 10080, interval: 30, intervalUnit: 'minute' },
  { label: "1 месяц", value: "1m", minutes: 43200, interval: 3, intervalUnit: 'hour' },
  { label: "1 год", value: "1y", minutes: 525600, interval: 1, intervalUnit: 'day' }
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
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [selectedSensors, setSelectedSensors] = useState<SensorId[]>([...SENSOR_IDS]);
  const [data, setData] = useState<SensorPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveData, setLiveData] = useState<Record<string, { humidity: number; temperature: number; timestamp: number }>>({});
  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Округляем текущее время до ближайших 5 минут
        const now = new Date();
        const end = new Date(Math.ceil(now.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));
        const start = new Date(end.getTime() - 60 * 60 * 1000); // 1 час назад

        const requestBody = {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          sensorIds: SENSOR_IDS
        };

        console.log("[fetchData] Request:", {
          timeRange: {
            start: start.toLocaleTimeString(),
            end: end.toLocaleTimeString()
          },
          body: requestBody
        });

        const historyResponse = await fetch('/api/humidity-records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify(requestBody),
        });

        if (!historyResponse.ok) {
          const errorText = await historyResponse.text();
          console.error('Failed to fetch data:', {
            status: historyResponse.status,
            statusText: historyResponse.statusText,
            error: errorText
          });
          return;
        }

        const historicalData = await historyResponse.json();

        if (!Array.isArray(historicalData)) {
          console.error('Invalid data format received:', historicalData);
          return;
        }

        console.log("[fetchData] Received data:", {
          count: historicalData.length,
          firstPoint: historicalData[0],
          lastPoint: historicalData[historicalData.length - 1]
        });

        // Ensure timestamps are numbers and sort data
        const processedData = historicalData
          .map(point => ({
            ...point,
            timestamp: typeof point.timestamp === 'number' ? point.timestamp : new Date(point.timestamp).getTime()
          }))
          .sort((a, b) => a.timestamp - b.timestamp);

        setData(processedData);

      } catch (error) {
        console.error('Error fetching sensor data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Prepare chart data
  const chartData = {
    datasets: selectedSensors.flatMap(sensorId => [
      {
        label: `Температура ${sensorId}`,
        data: data
          .filter(point => point.sensor_id === sensorId)
          .map(point => ({
            x: point.timestamp,
            y: point.temperature
          })),
        borderColor: COLORS[sensorId].temperature,
        backgroundColor: COLORS[sensorId].temperatureBg,
        yAxisID: 'y1',
        pointRadius: 2,
        borderWidth: 2,
        fill: true,
        tension: 0.4
      },
      {
        label: `Влажность ${sensorId}`,
        data: data
          .filter(point => point.sensor_id === sensorId)
          .map(point => ({
            x: point.timestamp,
            y: point.humidity
          })),
        borderColor: COLORS[sensorId].humidity,
        backgroundColor: COLORS[sensorId].humidityBg,
        yAxisID: 'y2',
        pointRadius: 2,
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ])
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
        position: 'bottom',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm'
          },
          tooltipFormat: 'HH:mm:ss',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 13,
          font: {
            size: 12
          },
          callback: function(value) {
            const date = new Date(value);
            const minutes = date.getMinutes();
            // Only show labels for timestamps at 5-minute intervals
            return minutes % 5 === 0 ? format(date, 'HH:mm') : '';
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        min: 0,
        max: 50,
        grid: {
          color: 'rgba(255, 214, 2, 0.1)'
        },
        ticks: {
          color: '#ffd602',
          font: {
            size: 12,
            weight: 'bold'
          },
          stepSize: 5,
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
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        }
      }
    }
  };

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const canvas = chart.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentX: number | null = null;

    const drawVerticalLine = (x: number) => {
      if (!ctx || !chart) return;
      
      const { top, bottom } = chart.chartArea;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.restore();
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      const chartX = x - rect.left;
      currentX = chartX;

      requestAnimationFrame(() => {
        chart.update('none');
        if (currentX !== null) {
          drawVerticalLine(currentX);
        }
      });
    };

    const handleLeave = () => {
      currentX = null;
      chart.update('none');
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('touchend', handleLeave);

    // Перерисовываем линию после каждого обновления графика
    const originalUpdate = chart.update;
    chart.update = function(mode?: 'default' | 'resize' | 'reset' | 'none' | 'hide' | 'show' | 'active') {
      originalUpdate.call(this, mode);
      if (currentX !== null) {
        drawVerticalLine(currentX);
      }
    };

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('touchend', handleLeave);
      chart.update = originalUpdate;
    };
  }, []);

  return (
    <div className="w-full h-[400px] bg-black/20 rounded-lg p-4">
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-white">Загрузка данных...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-white">Нет данных за выбранный период</span>
        </div>
      ) : (
        <Line data={chartData} options={options} ref={chartRef} />
      )}
    </div>
  );
}