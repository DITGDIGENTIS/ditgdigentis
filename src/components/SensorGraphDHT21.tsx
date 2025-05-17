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
import { format, startOfDay, addDays } from 'date-fns';
import { uk } from 'date-fns/locale';

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
  intervalUnit: 'seconds' | 'minutes' | 'hours' | 'days';
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "1 час", value: "1h", minutes: 60, interval: 3, intervalUnit: 'seconds' },
  { label: "12 часов", value: "12h", minutes: 720, interval: 30, intervalUnit: 'seconds' },
  { label: "1 день", value: "1d", minutes: 1440, interval: 5, intervalUnit: 'minutes' },
  { label: "1 неделя", value: "1w", minutes: 10080, interval: 30, intervalUnit: 'minutes' },
  { label: "1 месяц", value: "1m", minutes: 43200, interval: 3, intervalUnit: 'hours' },
  { label: "1 год", value: "1y", minutes: 525600, interval: 1, intervalUnit: 'days' }
];

const COLORS = {
  "HUM1-1": {
    temperature: 'rgba(255, 99, 132, 1)',
    temperatureBg: 'rgba(255, 99, 132, 0.1)',
    humidity: 'rgba(54, 162, 235, 1)',
    humidityBg: 'rgba(54, 162, 235, 0.1)'
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

  const fetchData = async () => {
    setIsLoading(prev => !data.length && prev);
    try {
      // Fetch historical data
      const startDate = startOfDay(new Date(selectedDate));
      const endDate = addDays(startDate, 1);
      const response = await fetch('/api/humidity-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          sensorIds: SENSOR_IDS
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to fetch historical data:', response.status);
        return;
      }

      const historicalData = await response.json();
      
      // Fetch current data
      const liveResponse = await fetch('/api/humidity', { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!liveResponse.ok) {
        console.error('Failed to fetch live data:', liveResponse.status);
        setData(historicalData);
        return;
      }

      const { sensors: liveSensors } = await liveResponse.json();
      setLiveData(prev => ({
        ...prev,
        ...liveSensors
      }));

      // Combine historical and live data
      const combinedData = [...historicalData];
      
      // Add live data points if they're newer than the last historical point
      const lastHistoricalTimestamp = Math.max(...historicalData.map((d: SensorPoint) => d.timestamp), 0);
      
      Object.entries(liveSensors || {}).forEach(([sensorId, data]: [string, any]) => {
        if (SENSOR_IDS.includes(sensorId as SensorId) && 
            data.timestamp && 
            data.humidity && 
            data.temperature && 
            data.timestamp > lastHistoricalTimestamp) {
          combinedData.push({
            sensor_id: sensorId,
            timestamp: data.timestamp,
            humidity: parseFloat(data.humidity),
            temperature: parseFloat(data.temperature)
          });
        }
      });

      setData(prev => {
        if (combinedData.length === 0) return prev;
        return combinedData;
      });
    } catch (error) {
      console.error('Error fetching sensor data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedDate, selectedPeriod]);

  const chartData = {
    datasets: selectedSensors.flatMap(sensorId => {
      const sensorData = data.filter(point => point.sensor_id === sensorId);
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
          tension: 0.5,
          pointRadius: 0,
          borderWidth: 2,
          fill: true
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
          tension: 0.5,
          pointRadius: 0,
          borderWidth: 2,
          fill: true
        }
      ];
    })
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        type: 'time',
        position: 'bottom',
        time: {
          unit: selectedPeriod.value === '1h' ? 'minute' : 
                selectedPeriod.value === '12h' ? 'hour' :
                selectedPeriod.value === '1d' ? 'hour' :
                selectedPeriod.value === '1w' ? 'day' :
                selectedPeriod.value === '1m' ? 'day' : 'month',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm',
            day: 'dd.MM',
            month: 'MM.yyyy'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          tickLength: 10
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 15,
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
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
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
          drawOnChartArea: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
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
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 12
        }
      }
    }
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

      <div className="chart-container">
        <div className="scroll-container">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </div>
            </div>
          ) : (
            <div className="graph-wrapper">
              <Line ref={chartRef} options={options} data={chartData} />
            </div>
          )}
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

        .chart-container {
          position: relative;
          margin-top: 20px;
          height: 500px;
          width: 100%;
        }

        .scroll-container {
          width: 100%;
          height: 100%;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .graph-wrapper {
          width: 100%;
          min-width: 800px;
          height: 100%;
        }

        @media (max-width: 768px) {
          .sensor-graph-container {
            padding: 10px;
          }

          .chart-container {
            height: 400px;
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
      `}</style>
    </div>
  );
}