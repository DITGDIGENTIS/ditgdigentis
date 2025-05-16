import React, { useEffect, useRef, useState, useMemo } from 'react';
import _ from 'lodash';

interface SensorPoint {
  sensor_id: string;
  timestamp: number;
  humidity: number;
  temperature: number;
}

const SENSOR_IDS = ["HUM1-1", "HUM1-2"] as const;
type SensorId = (typeof SENSOR_IDS)[number];

interface ColorKey {
  [key: string]: string;
}

const COLORS: ColorKey = {
  "HUM1-1_humidity": "#4dabf7",
  "HUM1-1_temperature": "#ffa500",
  "HUM1-2_humidity": "#339af0",
  "HUM1-2_temperature": "#ff6b6b"
};

interface PeriodOption {
  label: string;
  minutes: number;
  interval: number;
  intervalUnit: 'seconds' | 'minutes' | 'hours' | 'days';
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "1 година", minutes: 60, interval: 3, intervalUnit: 'seconds' }, // каждые 3 секунды
  { label: "12 годин", minutes: 720, interval: 30, intervalUnit: 'seconds' }, // каждые 30 секунд
  { label: "1 день", minutes: 1440, interval: 5, intervalUnit: 'minutes' }, // каждые 5 минут
  { label: "1 тиждень", minutes: 10080, interval: 30, intervalUnit: 'minutes' }, // каждые 30 минут
  { label: "1 місяць", minutes: 43200, interval: 3, intervalUnit: 'hours' }, // каждые 3 часа
  { label: "1 рік", minutes: 525600, interval: 1, intervalUnit: 'days' } // каждый день
];

interface SVGSensorGraphProps {
  width?: number;
  height?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

const SVGSensorGraph: React.FC<SVGSensorGraphProps> = ({
  width = 1200,
  height = 600,
  padding = { top: 40, right: 60, bottom: 60, left: 60 }
}) => {
  const [data, setData] = useState<SensorPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[0]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([...SENSOR_IDS]);
  const [isLoading, setIsLoading] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
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

  // Размеры графика
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Функция для форматирования времени в зависимости от периода
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    
    switch(selectedPeriod.minutes) {
      case 60: // 1 час
        return date.toLocaleTimeString('uk-UA', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
      case 720: // 12 часов
        return date.toLocaleTimeString('uk-UA', { 
          hour: '2-digit', 
          minute: '2-digit'
        });
      case 1440: // 1 день
        return date.toLocaleTimeString('uk-UA', { 
          hour: '2-digit', 
          minute: '2-digit'
        });
      case 10080: // 1 неделя
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
      case 43200: // 1 месяц
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
      default: // 1 год
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }
  };

  // Функция для получения временных меток
  const getTimePoints = (): Date[] => {
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

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

  // Функция для масштабирования значений
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
      }
    };
  };

  // Функция для получения координат точки на графике
  const getPointCoordinates = (point: SensorPoint, scales: ReturnType<typeof getScales>) => {
    if (!scales) return null;

    const timePoints = getTimePoints();
    const xScale = graphWidth / (timePoints.length - 1);
    
    // Находим ближайшую временную метку
    const pointTime = new Date(point.timestamp);
    const timeIndex = timePoints.findIndex(time => {
      const diff = Math.abs(time.getTime() - pointTime.getTime());
      return diff < selectedPeriod.interval * 1000; // Конвертируем интервал в миллисекунды
    });

    if (timeIndex === -1) return null;

    const x = padding.left + timeIndex * xScale;
    
    const humidityY = padding.top + (scales.humidity.max - point.humidity) / 
      (scales.humidity.max - scales.humidity.min) * graphHeight;
    
    const temperatureY = padding.top + (scales.temperature.max - point.temperature) / 
      (scales.temperature.max - scales.temperature.min) * graphHeight;

    return { x, humidityY, temperatureY };
  };

  // Функция для отрисовки линий графика
  const renderLines = () => {
    const scales = getScales();
    if (!scales) return null;

    return selectedSensors.map(sensorId => {
      const sensorData = data.filter(point => point.sensor_id === sensorId);
      const points = sensorData.map(point => getPointCoordinates(point, scales)).filter((p): p is NonNullable<typeof p> => p !== null);

      if (points.length < 2) return null;

      return (
        <g key={sensorId} className="sensor-lines">
          {/* Линия влажности */}
          <path
            d={`M ${points.map(p => `${p.x},${p.humidityY}`).join(' L ')}`}
            stroke={COLORS[`${sensorId}_humidity`]}
            strokeWidth="2"
            fill="none"
          />
          {/* Линия температуры */}
          <path
            d={`M ${points.map(p => `${p.x},${p.temperatureY}`).join(' L ')}`}
            stroke={COLORS[`${sensorId}_temperature`]}
            strokeWidth="2"
            fill="none"
          />
          {/* Точки для интерактивности */}
          {points.map((point, index) => {
            const originalData = sensorData[index];
            return (
              <g key={`points-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.humidityY}
                  r="4"
                  fill={COLORS[`${sensorId}_humidity`]}
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
                  fill={COLORS[`${sensorId}_temperature`]}
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
    });
  };

  // Функция для отрисовки тултипа
  const renderTooltip = () => {
    if (!hoveredPoint) return null;

    const tooltipX = hoveredPoint.x + 10;
    const tooltipY = hoveredPoint.y - 10;

    return (
      <g className="tooltip" transform={`translate(${tooltipX},${tooltipY})`}>
        <rect
          x="-5"
          y="-35"
          width="160"
          height="70"
          fill="rgba(35, 35, 35, 0.95)"
          stroke="#666"
          rx="4"
        />
        <text x="5" y="-15" fill="#fff" fontSize="12">
          {hoveredPoint.values.sensorId}
        </text>
        <text x="5" y="5" fill="#44c0ff" fontSize="12">
          Вологість: {hoveredPoint.values.humidity.toFixed(1)}%
        </text>
        <text x="5" y="25" fill="#ffa500" fontSize="12">
          Температура: {hoveredPoint.values.temperature.toFixed(1)}°C
        </text>
      </g>
    );
  };

  // Функция для генерации делений шкалы
  const generateTicks = (min: number, max: number, count: number = 5): number[] => {
    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  };

  // Обновляем функцию renderSVG
  const renderSVG = () => {
    const timePoints = getTimePoints();
    const xScale = graphWidth / (timePoints.length - 1);
    const scales = getScales();
    
    // Генерируем деления для осей
    const humidityTicks = scales ? generateTicks(scales.humidity.min, scales.humidity.max) : [];
    const temperatureTicks = scales ? generateTicks(scales.temperature.min, scales.temperature.max) : [];
    
    return (
      <>
        {/* Горизонтальные линии сетки и метки значений */}
        <g className="grid-horizontal">
          {humidityTicks.map((tick, index) => {
            const y = padding.top + (scales!.humidity.max - tick) / 
              (scales!.humidity.max - scales!.humidity.min) * graphHeight;
            return (
              <g key={`humidity-tick-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#444"
                  strokeDasharray="3,3"
                />
                <text
                  x={padding.left - 10}
                  y={y}
                  fill="#44c0ff"
                  fontSize="12"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {tick.toFixed(1)}%
                </text>
              </g>
            );
          })}
          {temperatureTicks.map((tick, index) => {
            const y = padding.top + (scales!.temperature.max - tick) / 
              (scales!.temperature.max - scales!.temperature.min) * graphHeight;
            return (
              <g key={`temperature-tick-${index}`}>
                <text
                  x={width - padding.right + 10}
                  y={y}
                  fill="#ffa500"
                  fontSize="12"
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {tick.toFixed(1)}°C
                </text>
              </g>
            );
          })}
        </g>

        {/* Вертикальные линии сетки и метки времени */}
        <g className="grid">
          {timePoints.map((time, index) => (
            <line
              key={`grid-${index}`}
              x1={padding.left + index * xScale}
              y1={padding.top}
              x2={padding.left + index * xScale}
              y2={height - padding.bottom}
              stroke="#444"
              strokeDasharray="3,3"
            />
          ))}
        </g>

        {/* Ось X */}
        <g className="x-axis">
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#666"
            strokeWidth="2"
          />
          {timePoints.map((time, index) => (
            <g
              key={`time-${index}`}
              transform={`translate(${padding.left + index * xScale},${height - padding.bottom + 20})`}
            >
              <text
                transform="rotate(-45)"
                textAnchor="end"
                fill="#999"
                fontSize="12"
              >
                {formatTime(time.getTime())}
              </text>
            </g>
          ))}
        </g>

        {/* Оси Y */}
        <g className="y-axis-left">
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#44c0ff"
            strokeWidth="2"
          />
          <text
            transform={`translate(${padding.left - 40},${height / 2}) rotate(-90)`}
            fill="#44c0ff"
            textAnchor="middle"
            fontSize="14"
          >
            Вологість (%)
          </text>
        </g>

        <g className="y-axis-right">
          <line
            x1={width - padding.right}
            y1={padding.top}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#ffa500"
            strokeWidth="2"
          />
          <text
            transform={`translate(${width - padding.right + 40},${height / 2}) rotate(90)`}
            fill="#ffa500"
            textAnchor="middle"
            fontSize="14"
          >
            Температура (°C)
          </text>
        </g>

        {/* Линии графика */}
        {renderLines()}

        {/* Тултип */}
        {renderTooltip()}
      </>
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
        endDate.setDate(startDate.getDate() + 1);

        const queryParams = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          sensorIds: selectedSensors.join(',')
        });

        const response = await fetch(`/api/humidity-readings?${queryParams}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const readings = await response.json();
        setData(readings);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, selectedPeriod, selectedSensors]);

  // Функция для экспорта данных в CSV
  const exportToCSV = (sensorId: string) => {
    const sensorData = data.filter(point => point.sensor_id === sensorId);
    if (!sensorData.length) {
      console.warn(`No data available for ${sensorId}`);
      return;
    }

    // Форматируем данные для CSV
    const header = "Дата,Час,Температура,Вологість";
    const rows = sensorData.map(point => {
      const date = new Date(point.timestamp);
      return `${date.toLocaleDateString('uk-UA')},${date.toLocaleTimeString('uk-UA')},${point.temperature.toFixed(2)},${point.humidity.toFixed(2)}`;
    });
    
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // Создаем ссылку для скачивания
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${sensorId}_${selectedDate}_${selectedPeriod.label}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="svg-sensor-graph">
      <style jsx>{`
        .svg-sensor-graph {
          background-color: #2b2b2b;
          border-radius: 5px;
          padding: 1rem;
          color: #fff;
        }

        .controls {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .control-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .sensor-checkboxes {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .form-check {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .form-check input {
          margin: 0;
        }

        .form-check label {
          margin: 0;
          cursor: pointer;
          user-select: none;
        }

        .date-select,
        .period-select {
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          color: #fff;
          min-width: 120px;
        }

        .date-select:focus,
        .period-select:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.4);
        }

        .csv-button {
          padding: 0.25rem 0.75rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .csv-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .controls {
            flex-direction: column;
          }

          .control-group {
            width: 100%;
          }

          .date-select,
          .period-select {
            width: 100%;
          }

          .sensor-checkboxes {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          }
        }
      `}</style>

      <div className="controls">
        <div className="control-group sensor-checkboxes">
          {SENSOR_IDS.map((id) => (
            <div key={id} className="form-check">
              <input
                type="checkbox"
                id={`sensor-${id}`}
                checked={selectedSensors.includes(id)}
                onChange={(e) => {
                  const updated = e.target.checked
                    ? [...selectedSensors, id]
                    : selectedSensors.filter((s) => s !== id);
                  setSelectedSensors(updated);
                }}
              />
              <label htmlFor={`sensor-${id}`}>{id}</label>
            </div>
          ))}
        </div>

        <div className="control-group">
          <input
            type="date"
            className="date-select"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
          <select
            className="period-select"
            value={selectedPeriod.label}
            onChange={(e) => {
              const period = PERIOD_OPTIONS.find((p) => p.label === e.target.value);
              if (period) setSelectedPeriod(period);
            }}
          >
            {PERIOD_OPTIONS.map((period) => (
              <option key={period.label} value={period.label}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          {selectedSensors.map((id) => (
            <button
              key={id}
              className="csv-button"
              onClick={() => exportToCSV(id)}
              disabled={isLoading || !data.some(point => point.sensor_id === id)}
            >
              CSV {id}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Завантаження...
        </div>
      ) : (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {renderSVG()}
        </svg>
      )}
    </div>
  );
};

export default SVGSensorGraph; 