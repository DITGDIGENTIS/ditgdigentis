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
        const end = new Date();
        const start = new Date(end.getTime() - 60 * 60 * 1000); // Всегда 1 час

        console.log("[fetchData] Fetching data for range:", {
          start: start.toISOString(),
          end: end.toISOString()
        });

        const historyResponse = await fetch('/api/humidity-records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            sensorIds: SENSOR_IDS
          }),
        });

        if (!historyResponse.ok) {
          const error = await historyResponse.text();
          console.error('Failed to fetch historical data:', historyResponse.status, error);
          return;
        }

        const historicalData = await historyResponse.json();
        console.log("[fetchData] Received historical data:", historicalData);

        if (!Array.isArray(historicalData)) {
          console.error('Invalid historical data format:', historicalData);
          return;
        }

        // Получаем текущие данные
        const liveResponse = await fetch("/api/humidity", {
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        if (!liveResponse.ok) {
          console.error('Failed to fetch live data:', liveResponse.status);
          if (historicalData.length > 0) {
            setData(historicalData);
          }
          return;
        }

        const { sensors: sensorData } = await liveResponse.json();
        console.log("[fetchData] Received live data:", sensorData);
        
        const livePoints: SensorPoint[] = [];
        Object.entries(sensorData || {}).forEach(([sensorId, data]: [string, any]) => {
          if (SENSOR_IDS.includes(sensorId as SensorId) && 
              data.timestamp && 
              data.humidity && 
              data.temperature) {
            const ts = Number(data.timestamp);
            const h = parseFloat(String(data.humidity));
            const t = parseFloat(String(data.temperature));
            
            if (!isNaN(ts) && !isNaN(h) && !isNaN(t)) {
              livePoints.push({
                sensor_id: sensorId,
                timestamp: ts,
                humidity: h,
                temperature: t
              });
            }
          }
        });

        let combinedData = [...historicalData];
        
        // Добавляем текущие точки только если они новее последней исторической
        if (livePoints.length > 0) {
          livePoints.forEach(livePoint => {
            if (livePoint.timestamp >= start.getTime() && 
                livePoint.timestamp <= end.getTime()) {
              // Проверяем, нет ли уже точки с таким timestamp
              const existingPointIndex = combinedData.findIndex(
                point => point.timestamp === livePoint.timestamp
              );
              
              if (existingPointIndex === -1) {
                combinedData.push(livePoint);
              } else {
                combinedData[existingPointIndex] = livePoint;
              }
            }
          });
        }

        // Сортируем данные по времени
        combinedData = combinedData.sort((a, b) => a.timestamp - b.timestamp);
        
        console.log("[fetchData] Final data points:", combinedData.length);

        setData(combinedData);
        setLiveData(prev => ({
          ...prev,
          ...sensorData
        }));
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

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
            minute: 'HH:mm',
            hour: 'HH:mm'
          },
          tooltipFormat: 'HH:mm:ss'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawOnChartArea: true
        },
        ticks: {
          source: 'auto',
          autoSkip: true,
          maxRotation: 0,
          maxTicksLimit: 12,
          font: {
            size: 12
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
            size: 12,
            weight: 'bold'
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        position: 'nearest',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffd602',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 214, 2, 0.3)',
        borderWidth: 1,
        padding: 10,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        displayColors: true
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

  const chartData = {
    datasets: selectedSensors.flatMap(sensorId => {
      const sensorData = data.filter(point => point.sensor_id === sensorId);
      console.log(`[chartData] Data points for ${sensorId}:`, sensorData.length);
      
      return [
        {
          label: `Температура ${sensorId}`,
          data: sensorData.map(point => ({
            x: point.timestamp,
            y: point.temperature
          })),
          borderColor: COLORS[sensorId].temperature,
          backgroundColor: COLORS[sensorId].temperatureBg,
          yAxisID: 'y1',
          tension: 0.1,
          pointRadius: 1,
          borderWidth: 2,
          fill: true,
          spanGaps: false
        },
        {
          label: `Влажность ${sensorId}`,
          data: sensorData.map(point => ({
            x: point.timestamp,
            y: point.humidity
          })),
          borderColor: COLORS[sensorId].humidity,
          backgroundColor: COLORS[sensorId].humidityBg,
          yAxisID: 'y2',
          tension: 0.1,
          pointRadius: 1,
          borderWidth: 2,
          fill: true,
          spanGaps: false
        }
      ];
    })
  };

  return (
    <div className="sensor-graph-container">
      <div className="controls mb-3">
        <div className="row g-3 align-items-center">
          <div className="col-auto">
            <select
              className="form-select"
              value={selectedPeriod.value}
              onChange={(e) => setSelectedPeriod(PERIOD_OPTIONS.find(p => p.value === e.target.value) || PERIOD_OPTIONS[0])}
            >
              {PERIOD_OPTIONS.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            </div>
          <div className="col-auto">
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="col-auto">
            {SENSOR_IDS.map(sensorId => (
              <div key={sensorId} className="form-check form-check-inline">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`sensor-${sensorId}`}
                  checked={selectedSensors.includes(sensorId)}
            onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSensors([...selectedSensors, sensorId]);
                    } else {
                      setSelectedSensors(selectedSensors.filter(id => id !== sensorId));
                    }
                  }}
                />
                <label className="form-check-label" htmlFor={`sensor-${sensorId}`}>
                  {sensorId}
                  {liveData[sensorId] && (
                    <span className="ms-2">
                      ({liveData[sensorId].temperature.toFixed(1)}°C / {liveData[sensorId].humidity.toFixed(1)}%)
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        <div className="chart-container">
          <div className="y-axis-left"></div>
          <div className="chart-scroll-container">
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Загрузка...</span>
                </div>
              </div>
            ) : (
              <div className="chart-content">
                <Line ref={chartRef} options={options} data={chartData} />
              </div>
            )}
          </div>
          <div className="y-axis-right"></div>
        </div>
      </div>

        <style jsx>{`
        .sensor-graph-container {
          background: #1a1a1a;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 100%;
        }

          .chart-wrapper {
            position: relative;
          margin-top: 20px;
          height: 500px;
            width: 100%;
        }

          .chart-container {
          display: flex;
          height: 100%;
          width: 100%;
          position: relative;
        }

        .y-axis-left,
        .y-axis-right {
            position: relative;
          width: 50px;
            height: 100%;
          background-color: #1a1a1a;
          z-index: 2;
          }

        .chart-scroll-container {
            flex: 1;
            overflow-x: auto;
            overflow-y: hidden;
          margin: 0 -1px;
          position: relative;
        }

        .chart-content {
          min-width: 600px;
          height: 100%;
        }

        @media (max-width: 768px) {
          .sensor-graph-container {
            padding: 10px;
          }

          .chart-wrapper {
            height: 400px;
          }

          .chart-content {
            min-width: 400px;
          }
        }

        .form-select,
        .form-control,
        .form-check-input {
          background-color: #2a2a2a;
          border-color: #3a3a3a;
          color: #fff;
        }

        .form-select:focus,
        .form-control:focus,
        .form-check-input:focus {
          background-color: #2a2a2a;
          border-color: #4a4a4a;
          color: #fff;
          box-shadow: 0 0 0 0.25rem rgba(77, 171, 247, 0.25);
        }

        .form-check-label {
          color: #fff;
        }

        .form-check-input:checked {
          background-color: #4dabf7;
          border-color: #4dabf7;
        }

        /* Стилизация скроллбара */
        .chart-scroll-container::-webkit-scrollbar {
          height: 8px;
        }

        .chart-scroll-container::-webkit-scrollbar-track {
          background: #2a2a2a;
          border-radius: 4px;
        }

        .chart-scroll-container::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          border-radius: 4px;
        }

        .chart-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
          }
        `}</style>
    </div>
  );
}