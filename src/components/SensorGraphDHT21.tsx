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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { format, startOfDay, addDays, addMinutes } from 'date-fns';
import { uk } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const SENSOR_IDS = ['HUM1-1', 'HUM1-2'] as const;

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
  },
  "HUM1-2": {
    temperature: 'rgba(255, 206, 86, 1)',
    temperatureBg: 'rgba(255, 206, 86, 0.1)',
    humidity: 'rgba(75, 192, 192, 1)',
    humidityBg: 'rgba(75, 192, 192, 0.1)'
  }
};

const getTimeFormat = (period: PeriodOption): string => {
  switch (period.value) {
    case '1h':
    case '12h':
      return 'HH:mm:ss';
    case '1d':
      return 'HH:mm';
    case '1w':
    case '1m':
      return 'dd.MM HH:mm';
    case '1y':
      return 'dd.MM.yyyy';
    default:
      return 'dd.MM.yyyy HH:mm';
  }
};

const generateMockData = (period: PeriodOption): SensorPoint[] => {
  const data: SensorPoint[] = [];
  const now = new Date();
  const startTime = now.getTime() - period.minutes * 60 * 1000;
  const intervalMs = period.interval * (
    period.intervalUnit === 'seconds' ? 500 :
    period.intervalUnit === 'minutes' ? 30 * 1000 :
    period.intervalUnit === 'hours' ? 5 * 60 * 1000 :
    15 * 60 * 1000
  );

  for (let timestamp = startTime; timestamp <= now.getTime(); timestamp += intervalMs) {
    SENSOR_IDS.forEach(sensorId => {
      const timeProgress = (timestamp - startTime) / (now.getTime() - startTime);
      const sinValue = Math.sin(timeProgress * Math.PI * 4);
      
      data.push({
        sensor_id: sensorId,
        timestamp,
        temperature: 25 + sinValue * 5,
        humidity: 50 + Math.cos(timeProgress * Math.PI * 3) * 20
      });
    });
  }

  return data;
};

export default function SensorGraphDHT21() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);
  const [selectedSensors, setSelectedSensors] = useState<SensorId[]>([...SENSOR_IDS]);
  const [data, setData] = useState<SensorPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const chartRef = useRef<ChartJS<'line'>>(null);

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
          },
          tooltipFormat: getTimeFormat(selectedPeriod)
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
        title: {
          display: true,
          text: 'Температура (°C)',
          color: 'rgba(255, 99, 132, 1)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
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
        title: {
          display: true,
          text: 'Влажность (%)',
          color: 'rgba(54, 162, 235, 1)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
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
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          usePointStyle: false,
          padding: 20,
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const startDate = startOfDay(new Date(selectedDate));
        const endDate = addDays(startDate, 1);

        // In a real application, this would be an API call
        // const response = await fetch(`/api/sensor-data?start=${startDate.toISOString()}&end=${endDate.toISOString()}&interval=${selectedPeriod.interval}&intervalUnit=${selectedPeriod.intervalUnit}`);
        // const newData = await response.json();
        
        // Using mock data for now
        const newData = generateMockData(selectedPeriod);
        setData(newData);
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
        </div>
      ) : (
        <div className="chart-outer-container">
          <div className="chart-container">
            <div className="graph-wrapper">
              <Line ref={chartRef} options={options} data={chartData} />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sensor-graph-container {
          background: #1a1a1a;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .chart-outer-container {
          position: relative;
          margin: 0 -20px;
        }

        .chart-container {
          position: relative;
          margin: 0 20px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #4a4a4a #2a2a2a;
        }

        .chart-container::-webkit-scrollbar {
          height: 8px;
        }

        .chart-container::-webkit-scrollbar-track {
          background: #2a2a2a;
          border-radius: 4px;
        }

        .chart-container::-webkit-scrollbar-thumb {
          background-color: #4a4a4a;
          border-radius: 4px;
        }

        .graph-wrapper {
          height: 500px;
          position: relative;
          margin-top: 20px;
          min-width: 2400px;
          padding: 0 20px;
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

        @media (max-width: 768px) {
          .sensor-graph-container {
            padding: 10px;
          }

          .chart-outer-container {
            margin: 0 -10px;
          }

          .chart-container {
            margin: 0 10px;
          }

          .graph-wrapper {
            padding: 0 10px;
          }

          .col-auto {
            width: 100%;
            margin-bottom: 10px;
          }

          .form-select,
          .form-control {
            width: 100%;
          }

          .graph-wrapper {
            height: 400px;
          }
        }
      `}</style>
    </div>
  );
}