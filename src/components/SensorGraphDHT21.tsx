"use client";

import React, { useEffect, useState } from 'react';
import _ from 'lodash';

interface SensorPoint {
  sensor_id: string;
  timestamp: number;
  humidity: number;
  temperature: number;
}

const SENSOR_IDS = ["HUM1-1", "HUM1-2"] as const;
type SensorId = (typeof SENSOR_IDS)[number];

const COLORS = {
  "HUM1-1_humidity": "#4dabf7",
  "HUM1-1_temperature": "#ffa500",
  "HUM1-2_humidity": "#339af0",
  "HUM1-2_temperature": "#ff6b6b"
} as const;

interface PeriodOption {
  label: string;
  value: string;
  minutes: number;
  interval: number;
  intervalUnit: 'seconds' | 'minutes' | 'hours' | 'days';
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "1 година", value: "1h", minutes: 60, interval: 3, intervalUnit: 'seconds' },
  { label: "12 годин", value: "12h", minutes: 720, interval: 30, intervalUnit: 'seconds' },
  { label: "1 день", value: "1d", minutes: 1440, interval: 5, intervalUnit: 'minutes' },
  { label: "1 тиждень", value: "1w", minutes: 10080, interval: 30, intervalUnit: 'minutes' },
  { label: "1 місяць", value: "1m", minutes: 43200, interval: 3, intervalUnit: 'hours' },
  { label: "1 рік", value: "1y", minutes: 525600, interval: 1, intervalUnit: 'days' }
];

export default function SensorGraphDHT21() {
  const [data, setData] = useState<SensorPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[0]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([...SENSOR_IDS]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    values: {
      sensorId: string;
      humidity: number;
      temperature: number;
      timestamp: number;
    };
  } | null>(null);

  // SVG dimensions and padding
  const width = 1200;
  const height = 600;
  const padding = { top: 40, right: 60, bottom: 60, left: 60 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Format time based on selected period
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    
    switch(selectedPeriod.value) {
      case "1h":
        return date.toLocaleTimeString('uk-UA', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
      case "12h":
      case "1d":
        return date.toLocaleTimeString('uk-UA', { 
          hour: '2-digit', 
          minute: '2-digit'
        });
      case "1w":
      case "1m":
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
      case "1y":
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      default:
        return date.toLocaleString('uk-UA');
    }
  };

  // Generate time points based on selected period
  const getTimePoints = (): Date[] => {
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + selectedPeriod.minutes);

    const points: Date[] = [];
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      points.push(new Date(currentDate));
      
      switch(selectedPeriod.intervalUnit) {
        case 'seconds':
          currentDate.setSeconds(currentDate.getSeconds() + selectedPeriod.interval);
          break;
        case 'minutes':
          currentDate.setMinutes(currentDate.getMinutes() + selectedPeriod.interval);
          break;
        case 'hours':
          currentDate.setHours(currentDate.getHours() + selectedPeriod.interval);
          break;
        case 'days':
          currentDate.setDate(currentDate.getDate() + selectedPeriod.interval);
          break;
      }
    }

    return points;
  };

  // Calculate scales for both humidity and temperature
  const getScales = () => {
    if (!data.length) return null;

    const humidityValues: number[] = [];
    const temperatureValues: number[] = [];

    data.forEach(point => {
      if (selectedSensors.includes(point.sensor_id)) {
        humidityValues.push(point.humidity);
        temperatureValues.push(point.temperature);
      }
    });

    const humidityMin = Math.min(...humidityValues);
    const humidityMax = Math.max(...humidityValues);
    const tempMin = Math.min(...temperatureValues);
    const tempMax = Math.max(...temperatureValues);

    const humidityPadding = (humidityMax - humidityMin) * 0.1;
    const tempPadding = (tempMax - tempMin) * 0.1;

    return {
      humidity: {
        min: Math.max(0, humidityMin - humidityPadding),
        max: Math.min(100, humidityMax + humidityPadding)
      },
      temperature: {
        min: tempMin - tempPadding,
        max: tempMax + tempPadding
      }
    };
  };

  // Calculate point coordinates
  const getPointCoordinates = (point: SensorPoint, scales: ReturnType<typeof getScales>) => {
    if (!scales) return null;

    const timePoints = getTimePoints();
    const xScale = graphWidth / (timePoints.length - 1);
    
    const pointTime = new Date(point.timestamp);
    const timeIndex = timePoints.findIndex(time => {
      const diff = Math.abs(time.getTime() - pointTime.getTime());
      const threshold = selectedPeriod.interval * 
        (selectedPeriod.intervalUnit === 'seconds' ? 1000 : 
         selectedPeriod.intervalUnit === 'minutes' ? 60000 :
         selectedPeriod.intervalUnit === 'hours' ? 3600000 : 86400000);
      return diff < threshold;
    });

    if (timeIndex === -1) return null;

    const x = padding.left + timeIndex * xScale;
    
    const humidityY = padding.top + (scales.humidity.max - point.humidity) / 
      (scales.humidity.max - scales.humidity.min) * graphHeight;
    
    const temperatureY = padding.top + (scales.temperature.max - point.temperature) / 
      (scales.temperature.max - scales.temperature.min) * graphHeight;

    return { x, humidityY, temperatureY };
  };

  // Generate axis ticks
  const generateTicks = (min: number, max: number, count: number = 5): number[] => {
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  };

  // Render tooltip
  const renderTooltip = () => {
    if (!hoveredPoint) return null;

    const { x, y, values } = hoveredPoint;
    const tooltipX = x + 10;
    const tooltipY = y - 10;

    return (
      <g className="tooltip" transform={`translate(${tooltipX},${tooltipY})`}>
        <rect
          x={0}
          y={0}
          width={200}
          height={80}
          fill="white"
          stroke="#ccc"
          rx={4}
        />
        <text x={10} y={20} fill="black" fontSize={12}>
          {`Сенсор: ${values.sensorId}`}
        </text>
        <text x={10} y={40} fill="black" fontSize={12}>
          {`Вологість: ${values.humidity.toFixed(1)}%`}
        </text>
        <text x={10} y={60} fill="black" fontSize={12}>
          {`Температура: ${values.temperature.toFixed(1)}°C`}
        </text>
      </g>
    );
  };

  // Render the main SVG
  const renderSVG = () => {
    const scales = getScales();
    if (!scales) return null;

    const timePoints = getTimePoints();
    const xScale = graphWidth / (timePoints.length - 1);

    // Generate ticks for both axes
    const humidityTicks = generateTicks(scales.humidity.min, scales.humidity.max);
    const temperatureTicks = generateTicks(scales.temperature.min, scales.temperature.max);
    const timeTicks = timePoints.filter((_, i) => i % Math.max(1, Math.floor(timePoints.length / 10)) === 0);

    return (
      <svg width={width} height={height} className="sensor-graph">
        {/* Grid lines */}
        <g className="grid-lines">
          {humidityTicks.map((tick, i) => (
            <line
              key={`grid-h-${i}`}
              x1={padding.left}
              y1={padding.top + (scales.humidity.max - tick) / (scales.humidity.max - scales.humidity.min) * graphHeight}
              x2={width - padding.right}
              y2={padding.top + (scales.humidity.max - tick) / (scales.humidity.max - scales.humidity.min) * graphHeight}
              stroke="#eee"
              strokeWidth="1"
            />
          ))}
        </g>

        {/* Axis labels */}
        <g className="axis-labels">
          {/* Y-axis labels (humidity) */}
          {humidityTicks.map((tick, i) => (
            <text
              key={`label-h-${i}`}
              x={padding.left - 10}
              y={padding.top + (scales.humidity.max - tick) / (scales.humidity.max - scales.humidity.min) * graphHeight}
              textAnchor="end"
              alignmentBaseline="middle"
              fontSize={12}
              fill="#666"
            >
              {tick.toFixed(1)}%
            </text>
          ))}

          {/* Y-axis labels (temperature) */}
          {temperatureTicks.map((tick, i) => (
            <text
              key={`label-t-${i}`}
              x={width - padding.right + 10}
              y={padding.top + (scales.temperature.max - tick) / (scales.temperature.max - scales.temperature.min) * graphHeight}
              textAnchor="start"
              alignmentBaseline="middle"
              fontSize={12}
              fill="#666"
            >
              {tick.toFixed(1)}°C
            </text>
          ))}

          {/* X-axis labels */}
          {timeTicks.map((time, i) => (
            <text
              key={`label-x-${i}`}
              x={padding.left + (i * (graphWidth / (timeTicks.length - 1)))}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize={12}
              fill="#666"
              transform={`rotate(-45 ${padding.left + (i * (graphWidth / (timeTicks.length - 1)))} ${height - padding.bottom + 20})`}
            >
              {formatTime(time.getTime())}
            </text>
          ))}
        </g>

        {/* Data lines and points */}
        {selectedSensors.map(sensorId => {
          const sensorData = data.filter(point => point.sensor_id === sensorId);
          const points = sensorData
            .map(point => getPointCoordinates(point, scales))
            .filter((p): p is NonNullable<typeof p> => p !== null);

          if (points.length < 2) return null;

          return (
            <g key={sensorId} className="sensor-lines">
              {/* Humidity line */}
              <path
                d={`M ${points.map(p => `${p.x},${p.humidityY}`).join(' L ')}`}
                stroke={COLORS[`${sensorId}_humidity` as keyof typeof COLORS]}
                strokeWidth="2"
                fill="none"
              />
              {/* Temperature line */}
              <path
                d={`M ${points.map(p => `${p.x},${p.temperatureY}`).join(' L ')}`}
                stroke={COLORS[`${sensorId}_temperature` as keyof typeof COLORS]}
                strokeWidth="2"
                fill="none"
              />
              {/* Interactive points */}
              {points.map((point, index) => {
                const originalData = sensorData[index];
                return (
                  <g key={`points-${index}`}>
                    <circle
                      cx={point.x}
                      cy={point.humidityY}
                      r="4"
                      fill={COLORS[`${sensorId}_humidity` as keyof typeof COLORS]}
                      opacity="0"
                      onMouseEnter={() => setHoveredPoint({
                        x: point.x,
                        y: point.humidityY,
                        values: {
                          sensorId,
                          humidity: originalData.humidity,
                          temperature: originalData.temperature,
                          timestamp: originalData.timestamp
                        }
                      })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    <circle
                      cx={point.x}
                      cy={point.temperatureY}
                      r="4"
                      fill={COLORS[`${sensorId}_temperature` as keyof typeof COLORS]}
                      opacity="0"
                      onMouseEnter={() => setHoveredPoint({
                        x: point.x,
                        y: point.temperatureY,
                        values: {
                          sensorId,
                          humidity: originalData.humidity,
                          temperature: originalData.temperature,
                          timestamp: originalData.timestamp
                        }
                      })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Tooltip */}
        {renderTooltip()}
      </svg>
    );
  };

  // Export data to CSV
  const exportToCSV = (sensorId: string) => {
    const sensorData = data.filter(point => point.sensor_id === sensorId);
    const csvContent = [
      "Timestamp,Humidity,Temperature",
      ...sensorData.map(point => 
        `${new Date(point.timestamp).toISOString()},${point.humidity},${point.temperature}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sensor_${sensorId}_${selectedDate}.csv`;
    link.click();
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + selectedPeriod.minutes);

        const response = await fetch(`/api/sensor-data?start=${startDate.toISOString()}&end=${endDate.toISOString()}&interval=${selectedPeriod.interval}&intervalUnit=${selectedPeriod.intervalUnit}`);
        const newData = await response.json();
        setData(newData);
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, selectedPeriod]);

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
          <div className="col-auto">
            {SENSOR_IDS.map(sensorId => (
              <button
                key={`export-${sensorId}`}
                className="btn btn-outline-secondary btn-sm ms-2"
                onClick={() => exportToCSV(sensorId)}
              >
                Export {sensorId}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        renderSVG()
      )}
    </div>
  );
} 