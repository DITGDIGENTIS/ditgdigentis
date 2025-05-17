"use client";

import React, { useEffect, useState, useMemo } from 'react';

interface SensorPoint {
  sensor_id: string;
  timestamp: number;
  humidity: number;
  temperature: number;
}

const SENSOR_IDS = ["HUM1-1", "HUM1-2"] as const;
type SensorId = (typeof SENSOR_IDS)[number];

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

type SensorColors = {
  humidity: string;
  temperature: string;
};

const COLORS = {
  grid: '#f0f0f0',
  axis: '#666',
  text: '#333',
  tooltip: {
    bg: 'rgba(255, 255, 255, 0.95)',
    border: '#ccc',
    text: '#333'
  },
  "HUM1-1": {
    humidity: "#4dabf7",
    temperature: "#ff9f43"
  } as SensorColors,
  "HUM1-2": {
    humidity: "#339af0",
    temperature: "#ff6b6b"
  } as SensorColors
} as const;

type ColorType = typeof COLORS;
type SensorColorKey = keyof ColorType;

// Создаем моковые данные для тестирования
const generateMockData = (period: PeriodOption): SensorPoint[] => {
  const points: SensorPoint[] = [];
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  let currentDate = new Date(startDate);
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + period.minutes);

  while (currentDate < endDate) {
    SENSOR_IDS.forEach(sensorId => {
      points.push({
        sensor_id: sensorId,
        timestamp: currentDate.getTime(),
        temperature: 20 + Math.random() * 10,
        humidity: 40 + Math.random() * 30
      });
    });

    switch (period.intervalUnit) {
      case 'seconds':
        currentDate.setSeconds(currentDate.getSeconds() + period.interval);
        break;
      case 'minutes':
        currentDate.setMinutes(currentDate.getMinutes() + period.interval);
        break;
      case 'hours':
        currentDate.setHours(currentDate.getHours() + period.interval);
        break;
      case 'days':
        currentDate.setDate(currentDate.getDate() + period.interval);
        break;
    }
  }

  return points;
};

export default function SensorGraphDHT21() {
  // Состояния
  const [data, setData] = useState<SensorPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[0]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([...SENSOR_IDS]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    sensorId: string;
    humidity: number;
    temperature: number;
    timestamp: number;
  } | null>(null);
  const [dimensions, setDimensions] = useState({
    width: 1200,
    height: 600,
    padding: { top: 40, right: 80, bottom: 60, left: 80 }
  });

  // Вычисляем размеры графика
  const { graphWidth, graphHeight } = useMemo(() => ({
    graphWidth: dimensions.width - dimensions.padding.left - dimensions.padding.right,
    graphHeight: dimensions.height - dimensions.padding.top - dimensions.padding.bottom
  }), [dimensions]);

  // Форматирование времени
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

  // Получаем временные точки
  const getTimePoints = useMemo(() => {
    const points: Date[] = [];
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + selectedPeriod.minutes);

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
  }, [selectedDate, selectedPeriod]);

  // Вычисляем масштабы для осей
  const scales = useMemo(() => {
    if (!data.length) return null;

    const filteredData = data.filter(point => selectedSensors.includes(point.sensor_id));
    
    const humidityValues = filteredData.map(d => d.humidity);
    const temperatureValues = filteredData.map(d => d.temperature);

    const humidityMin = Math.min(...humidityValues);
    const humidityMax = Math.max(...humidityValues);
    const tempMin = Math.min(...temperatureValues);
    const tempMax = Math.max(...temperatureValues);

    // Добавляем отступы для лучшей визуализации
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
      },
      time: {
        min: getTimePoints[0].getTime(),
        max: getTimePoints[getTimePoints.length - 1].getTime()
      }
    };
  }, [data, selectedSensors, getTimePoints]);

  // Генерация делений для осей
  const generateTicks = (min: number, max: number, count: number = 6): number[] => {
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  };

  // Рендер осей и сетки
  const renderAxes = () => {
    if (!scales) return null;

    const humidityTicks = generateTicks(scales.humidity.min, scales.humidity.max);
    const temperatureTicks = generateTicks(scales.temperature.min, scales.temperature.max);
    const timeTicks = getTimePoints.filter((_, i) => 
      i % Math.max(1, Math.floor(getTimePoints.length / 10)) === 0
    );

    return (
      <g className="axes">
        {/* Сетка */}
        <g className="grid">
          {humidityTicks.map((tick, i) => (
            <line
              key={`grid-h-${i}`}
              x1={dimensions.padding.left}
              y1={dimensions.padding.top + (scales.humidity.max - tick) / (scales.humidity.max - scales.humidity.min) * graphHeight}
              x2={dimensions.width - dimensions.padding.right}
              y2={dimensions.padding.top + (scales.humidity.max - tick) / (scales.humidity.max - scales.humidity.min) * graphHeight}
              stroke={COLORS.grid}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
        </g>

        {/* Оси */}
        <g className="axis-lines">
          {/* Ось Y (влажность) */}
          <line
            x1={dimensions.padding.left}
            y1={dimensions.padding.top}
            x2={dimensions.padding.left}
            y2={dimensions.height - dimensions.padding.bottom}
            stroke={COLORS.axis}
            strokeWidth="2"
          />
          {/* Ось Y (температура) */}
          <line
            x1={dimensions.width - dimensions.padding.right}
            y1={dimensions.padding.top}
            x2={dimensions.width - dimensions.padding.right}
            y2={dimensions.height - dimensions.padding.bottom}
            stroke={COLORS.axis}
            strokeWidth="2"
          />
          {/* Ось X */}
          <line
            x1={dimensions.padding.left}
            y1={dimensions.height - dimensions.padding.bottom}
            x2={dimensions.width - dimensions.padding.right}
            y2={dimensions.height - dimensions.padding.bottom}
            stroke={COLORS.axis}
            strokeWidth="2"
          />
        </g>

        {/* Подписи */}
        <g className="axis-labels">
          {/* Подписи влажности */}
          {humidityTicks.map((tick, i) => (
            <text
              key={`humidity-${i}`}
              x={dimensions.padding.left - 10}
              y={dimensions.padding.top + (scales.humidity.max - tick) / (scales.humidity.max - scales.humidity.min) * graphHeight}
              textAnchor="end"
              alignmentBaseline="middle"
              fill={COLORS.text}
              fontSize="12"
            >
              {tick.toFixed(1)}%
            </text>
          ))}
          
          {/* Подписи температуры */}
          {temperatureTicks.map((tick, i) => (
            <text
              key={`temp-${i}`}
              x={dimensions.width - dimensions.padding.right + 10}
              y={dimensions.padding.top + (scales.temperature.max - tick) / (scales.temperature.max - scales.temperature.min) * graphHeight}
              textAnchor="start"
              alignmentBaseline="middle"
              fill={COLORS.text}
              fontSize="12"
            >
              {tick.toFixed(1)}°C
            </text>
          ))}

          {/* Подписи времени */}
          {timeTicks.map((time, i) => (
            <text
              key={`time-${i}`}
              x={dimensions.padding.left + (i * graphWidth / (timeTicks.length - 1))}
              y={dimensions.height - dimensions.padding.bottom + 25}
              textAnchor="middle"
              fill={COLORS.text}
              fontSize="12"
              transform={`rotate(-45 ${dimensions.padding.left + (i * graphWidth / (timeTicks.length - 1))} ${dimensions.height - dimensions.padding.bottom + 25})`}
            >
              {formatTime(time.getTime())}
            </text>
          ))}
        </g>

        {/* Названия осей */}
        <text
          x={-dimensions.height / 2}
          y={dimensions.padding.left / 3}
          transform="rotate(-90)"
          textAnchor="middle"
          fill={COLORS.text}
          fontSize="14"
        >
          Вологість (%)
        </text>
        <text
          x={dimensions.height / 2}
          y={dimensions.width - dimensions.padding.right / 3}
          transform="rotate(90)"
          textAnchor="middle"
          fill={COLORS.text}
          fontSize="14"
        >
          Температура (°C)
        </text>
      </g>
    );
  };

  // Рендер линий данных
  const renderDataLines = () => {
    if (!scales) return null;

    return selectedSensors.map(sensorId => {
      const sensorData = data.filter(point => point.sensor_id === sensorId);
      
      // Преобразуем точки в координаты SVG
      const points = sensorData.map(point => {
        const x = dimensions.padding.left + 
          ((point.timestamp - scales.time.min) / (scales.time.max - scales.time.min)) * graphWidth;
        
        const humidityY = dimensions.padding.top + 
          ((scales.humidity.max - point.humidity) / (scales.humidity.max - scales.humidity.min)) * graphHeight;
        
        const temperatureY = dimensions.padding.top + 
          ((scales.temperature.max - point.temperature) / (scales.temperature.max - scales.temperature.min)) * graphHeight;

        return { x, humidityY, temperatureY, ...point };
      });

      if (points.length < 2) return null;

      const sensorColors = COLORS[sensorId as keyof typeof COLORS] as SensorColors;

      return (
        <g key={sensorId} className="sensor-data">
          {/* Линия влажности */}
          <path
            d={`M ${points.map(p => `${p.x},${p.humidityY}`).join(' L ')}`}
            stroke={sensorColors.humidity}
            strokeWidth="2"
            fill="none"
          />
          
          {/* Линия температуры */}
          <path
            d={`M ${points.map(p => `${p.x},${p.temperatureY}`).join(' L ')}`}
            stroke={sensorColors.temperature}
            strokeWidth="2"
            fill="none"
          />

          {/* Точки и интерактивные области */}
          {points.map((point, index) => (
            <g key={`points-${index}`}>
              {/* Точка влажности */}
              <circle
                cx={point.x}
                cy={point.humidityY}
                r="4"
                fill={sensorColors.humidity}
              />
              <circle
                cx={point.x}
                cy={point.humidityY}
                r="8"
                fill="transparent"
                onMouseEnter={() => setHoveredPoint({
                  x: point.x,
                  y: point.humidityY,
                  sensorId,
                  humidity: point.humidity,
                  temperature: point.temperature,
                  timestamp: point.timestamp
                })}
                onMouseLeave={() => setHoveredPoint(null)}
              />

              {/* Точка температуры */}
              <circle
                cx={point.x}
                cy={point.temperatureY}
                r="4"
                fill={sensorColors.temperature}
              />
              <circle
                cx={point.x}
                cy={point.temperatureY}
                r="8"
                fill="transparent"
                onMouseEnter={() => setHoveredPoint({
                  x: point.x,
                  y: point.temperatureY,
                  sensorId,
                  humidity: point.humidity,
                  temperature: point.temperature,
                  timestamp: point.timestamp
                })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}
        </g>
      );
    });
  };

  // Рендер тултипа
  const renderTooltip = () => {
    if (!hoveredPoint) return null;

    const tooltipWidth = 200;
    const tooltipHeight = 80;
    const tooltipPadding = 10;

    // Корректируем позицию тултипа, чтобы он не выходил за границы SVG
    let tooltipX = hoveredPoint.x + 10;
    let tooltipY = hoveredPoint.y - tooltipHeight - 10;

    if (tooltipX + tooltipWidth > dimensions.width - dimensions.padding.right) {
      tooltipX = hoveredPoint.x - tooltipWidth - 10;
    }

    if (tooltipY < dimensions.padding.top) {
      tooltipY = hoveredPoint.y + 10;
    }

    return (
      <g className="tooltip" transform={`translate(${tooltipX},${tooltipY})`}>
        <rect
          x={0}
          y={0}
          width={tooltipWidth}
          height={tooltipHeight}
          fill={COLORS.tooltip.bg}
          stroke={COLORS.tooltip.border}
          rx={4}
        />
        <text x={tooltipPadding} y={tooltipPadding * 2} fill={COLORS.tooltip.text} fontSize="12">
          {`Сенсор: ${hoveredPoint.sensorId}`}
        </text>
        <text x={tooltipPadding} y={tooltipPadding * 3.5} fill={COLORS.tooltip.text} fontSize="12">
          {`Вологість: ${hoveredPoint.humidity.toFixed(1)}%`}
        </text>
        <text x={tooltipPadding} y={tooltipPadding * 5} fill={COLORS.tooltip.text} fontSize="12">
          {`Температура: ${hoveredPoint.temperature.toFixed(1)}°C`}
        </text>
        <text x={tooltipPadding} y={tooltipPadding * 6.5} fill={COLORS.tooltip.text} fontSize="12">
          {formatTime(hoveredPoint.timestamp)}
        </text>
      </g>
    );
  };

  // Эффект для загрузки данных
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + selectedPeriod.minutes);

        // В реальном приложении здесь был бы запрос к API
        // const response = await fetch(`/api/sensor-data?start=${startDate.toISOString()}&end=${endDate.toISOString()}&interval=${selectedPeriod.interval}&intervalUnit=${selectedPeriod.intervalUnit}`);
        // const newData = await response.json();
        
        // Пока используем моковые данные
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

  // Эффект для адаптивности
  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('.sensor-graph-container');
      if (container) {
        const width = Math.max(320, Math.min(1200, container.clientWidth));
        const height = Math.max(300, width * 0.5);
        setDimensions(prev => ({
          ...prev,
          width,
          height
        }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="graph-wrapper" style={{ position: 'relative' }}>
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="sensor-graph"
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            {renderAxes()}
            {renderDataLines()}
            {renderTooltip()}
          </svg>
        </div>
      )}

      <style jsx>{`
        .sensor-graph-container {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .graph-wrapper {
          overflow: hidden;
          border-radius: 4px;
        }

        .form-select,
        .form-control {
          min-width: 120px;
        }

        @media (max-width: 768px) {
          .sensor-graph-container {
            padding: 10px;
          }

          .controls {
            flex-direction: column;
          }

          .col-auto {
            width: 100%;
            margin-bottom: 10px;
          }

          .form-select,
          .form-control {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}