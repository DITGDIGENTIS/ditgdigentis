"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleTime, scaleLinear } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { useMedia, useWindowSize } from 'react-use';

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

// Анимации для элементов графика
const lineVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: { 
      duration: 1,
      ease: "easeInOut"
    }
  }
};

const pointVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 500,
      damping: 25
    }
  }
};

interface Dimensions {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export default function SensorGraphDHT21() {
  // Состояния
  const [data, setData] = useState<SensorPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[0]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([...SENSOR_IDS]);
  const [isLoading, setIsLoading] = useState(false);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 1200,
    height: 600,
    padding: {
      top: 40,
      right: 80,
      bottom: 60,
      left: 80
    }
  });
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    sensorId: string;
    humidity: number;
    temperature: number;
    timestamp: number;
  } | null>(null);

  // Используем хук для определения размера окна
  const { width: windowWidth } = useWindowSize();
  
  // Медиа-запросы для адаптивности
  const isMobile = useMedia('(max-width: 768px)');
  const isTablet = useMedia('(max-width: 1024px)');

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
          height,
          padding: {
            top: isMobile ? 20 : 40,
            right: isMobile ? 40 : 80,
            bottom: isMobile ? 40 : 60,
            left: isMobile ? 40 : 80
          }
        }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // D3 scales для более точного масштабирования
  const scales = useMemo(() => {
    if (!data.length) return null;

    const filteredData = data.filter(point => selectedSensors.includes(point.sensor_id));
    
    const timeScale = scaleTime()
      .domain([
        new Date(Math.min(...filteredData.map(d => d.timestamp))),
        new Date(Math.max(...filteredData.map(d => d.timestamp)))
      ])
      .range([0, dimensions.width - dimensions.padding.left - dimensions.padding.right]);

    const humidityScale = scaleLinear()
      .domain([0, Math.max(...filteredData.map(d => d.humidity)) * 1.1])
      .range([dimensions.height - dimensions.padding.bottom, dimensions.padding.top]);

    const temperatureScale = scaleLinear()
      .domain([
        Math.min(...filteredData.map(d => d.temperature)) * 0.9,
        Math.max(...filteredData.map(d => d.temperature)) * 1.1
      ])
      .range([dimensions.height - dimensions.padding.bottom, dimensions.padding.top]);

    return { timeScale, humidityScale, temperatureScale };
  }, [data, selectedSensors, dimensions]);

  // Форматирование времени с использованием d3-time-format
  const timeFormatter = useMemo(() => {
    switch(selectedPeriod.value) {
      case "1h":
        return timeFormat("%H:%M:%S");
      case "12h":
      case "1d":
        return timeFormat("%H:%M");
      case "1w":
      case "1m":
        return timeFormat("%d.%m %H:%M");
      case "1y":
        return timeFormat("%d.%m");
      default:
        return timeFormat("%d.%m.%Y");
    }
  }, [selectedPeriod]);

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

  // Генерация делений для осей
  const generateTicks = (min: number, max: number, count: number = 6): number[] => {
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  };

  // Рендер осей и сетки
  const renderAxes = () => {
    if (!scales) return null;

    const humidityTicks = generateTicks(scales.humidityScale(0), scales.humidityScale(100));
    const temperatureTicks = generateTicks(scales.temperatureScale(20), scales.temperatureScale(30));
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
              y1={dimensions.padding.top + (scales.humidityScale(tick) - scales.humidityScale(0)) / (scales.humidityScale(100) - scales.humidityScale(0)) * dimensions.height}
              x2={dimensions.width - dimensions.padding.right}
              y2={dimensions.padding.top + (scales.humidityScale(tick) - scales.humidityScale(0)) / (scales.humidityScale(100) - scales.humidityScale(0)) * dimensions.height}
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
              y={dimensions.padding.top + (scales.humidityScale(tick) - scales.humidityScale(0)) / (scales.humidityScale(100) - scales.humidityScale(0)) * dimensions.height}
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
              y={dimensions.padding.top + (scales.temperatureScale(tick) - scales.temperatureScale(20)) / (scales.temperatureScale(30) - scales.temperatureScale(20)) * dimensions.height}
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
              x={dimensions.padding.left + (i * (dimensions.width - dimensions.padding.left - dimensions.padding.right) / (timeTicks.length - 1))}
              y={dimensions.height - dimensions.padding.bottom + 25}
              textAnchor="middle"
              fill={COLORS.text}
              fontSize="12"
              transform={`rotate(-45 ${dimensions.padding.left + (i * (dimensions.width - dimensions.padding.left - dimensions.padding.right) / (timeTicks.length - 1))} ${dimensions.height - dimensions.padding.bottom + 25})`}
            >
              {timeFormatter(new Date(time.getTime()))}
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

  // Рендер линий данных с анимацией
  const renderDataLines = () => {
    if (!scales) return null;

    return selectedSensors.map(sensorId => {
      const sensorData = data.filter(point => point.sensor_id === sensorId);
      const sensorColors = COLORS[sensorId as keyof typeof COLORS] as SensorColors;
      
      const humidityLine = sensorData.map(point => ({
        x: scales.timeScale(new Date(point.timestamp)),
        y: scales.humidityScale(point.humidity)
      }));

      const temperatureLine = sensorData.map(point => ({
        x: scales.timeScale(new Date(point.timestamp)),
        y: scales.temperatureScale(point.temperature)
      }));

      return (
        <g key={sensorId} className="sensor-data">
          <motion.path
            variants={lineVariants}
            initial="hidden"
            animate="visible"
            d={`M ${humidityLine.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={sensorColors.humidity}
            strokeWidth="2"
            fill="none"
          />
          
          <motion.path
            variants={lineVariants}
            initial="hidden"
            animate="visible"
            d={`M ${temperatureLine.map(p => `${p.x},${p.y}`).join(' L ')}`}
            stroke={sensorColors.temperature}
            strokeWidth="2"
            fill="none"
          />

          {sensorData.map((point, index) => (
            <g key={`points-${index}`}>
              <motion.circle
                variants={pointVariants}
                initial="hidden"
                animate="visible"
                cx={scales.timeScale(new Date(point.timestamp))}
                cy={scales.humidityScale(point.humidity)}
                r="4"
                fill={sensorColors.humidity}
                whileHover={{ scale: 1.5 }}
              />
              <motion.circle
                variants={pointVariants}
                initial="hidden"
                animate="visible"
                cx={scales.timeScale(new Date(point.timestamp))}
                cy={scales.temperatureScale(point.temperature)}
                r="4"
                fill={sensorColors.temperature}
                whileHover={{ scale: 1.5 }}
              />
            </g>
          ))}
        </g>
      );
    });
  };

  // Рендер тултипа с анимацией
  const renderTooltip = () => {
    if (!hoveredPoint || !scales) return null;

    return (
      <AnimatePresence>
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="tooltip"
          transform={`translate(${hoveredPoint.x + 10},${hoveredPoint.y - 10})`}
        >
          <rect
            x={0}
            y={0}
            width={200}
            height={80}
            fill={COLORS.tooltip.bg}
            stroke={COLORS.tooltip.border}
            rx={4}
            filter="url(#tooltip-shadow)"
          />
          <text x={10} y={20} fill={COLORS.tooltip.text} fontSize={12}>
            {`Сенсор: ${hoveredPoint.sensorId}`}
          </text>
          <text x={10} y={40} fill={COLORS.tooltip.text} fontSize={12}>
            {`Вологість: ${hoveredPoint.humidity.toFixed(1)}%`}
          </text>
          <text x={10} y={60} fill={COLORS.tooltip.text} fontSize={12}>
            {`Температура: ${hoveredPoint.temperature.toFixed(1)}°C`}
          </text>
        </motion.g>
      </AnimatePresence>
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
        <motion.div 
          className="text-center py-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          className="graph-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="sensor-graph"
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            <defs>
              <filter id="tooltip-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
              </filter>
            </defs>
            {renderAxes()}
            {renderDataLines()}
            {renderTooltip()}
          </svg>
        </motion.div>
      )}

      <style jsx>{`
        .sensor-graph-container {
          background: white;
          border-radius: 12px;
          padding: ${isMobile ? '10px' : '20px'};
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .graph-wrapper {
          overflow: hidden;
          border-radius: 8px;
          background: white;
        }

        .form-select,
        .form-control {
          min-width: ${isMobile ? '100%' : '120px'};
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          transition: all 0.2s ease;
        }

        .form-select:focus,
        .form-control:focus {
          border-color: ${COLORS["HUM1-1"].humidity};
          box-shadow: 0 0 0 2px ${COLORS["HUM1-1"].humidity}33;
        }

        @media (max-width: 768px) {
          .sensor-graph-container {
            border-radius: 8px;
          }

          .controls {
            flex-direction: column;
            gap: 10px;
          }

          .col-auto {
            width: 100%;
          }
        }

        @media (hover: hover) {
          .sensor-graph-container:hover {
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </div>
  );
}