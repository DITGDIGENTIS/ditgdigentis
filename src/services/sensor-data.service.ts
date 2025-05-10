import _ from "lodash";

export type SensorDataPoint = {
  sensor_id: string;
  temperature: number;
  humidity: number;
  timestamp?: Date;
};

export type SensorDataBatch = {
  sensors: SensorDataPoint[];
};

export type SensorAverages = {
  avgTemperature: number;
  avgHumidity: number;
};

// Валидация данных
export const validateSensorData = (data: SensorDataPoint): boolean => {
  if (!data || typeof data !== "object") return false;

  return (
    typeof data.sensor_id === "string" &&
    data.sensor_id.length > 0 &&
    typeof data.temperature === "number" &&
    !isNaN(data.temperature) &&
    typeof data.humidity === "number" &&
    !isNaN(data.humidity) &&
    (data.timestamp === undefined || data.timestamp instanceof Date)
  );
};

export const validateBatch = (batch: SensorDataBatch): boolean => {
  if (!batch || typeof batch !== "object") return false;
  if (!Array.isArray(batch.sensors)) return false;
  if (batch.sensors.length === 0) return false;

  return batch.sensors.every(validateSensorData);
};

// Создание данных сенсоров
export const createSensorData = (data: SensorDataBatch): SensorDataPoint[] => {
  if (!validateBatch(data)) {
    throw new Error("Invalid sensor data format");
  }

  return _.map(data.sensors, (sensor) => ({
    sensor_id: String(sensor.sensor_id),
    temperature: Number(_.round(sensor.temperature, 2)),
    humidity: Number(_.round(sensor.humidity, 2)),
    timestamp: sensor.timestamp || new Date(),
  }));
};

// Группировка и агрегация
export const groupBySensorId = (
  data: SensorDataPoint[]
): Record<string, SensorDataPoint[]> => _.groupBy(data, "sensor_id");

export const getLatestReadings = (
  data: SensorDataPoint[]
): Record<string, SensorDataPoint> =>
  _.flow([
    groupBySensorId,
    (grouped) =>
      _.mapValues(grouped, (readings) => {
        const latest = _.maxBy(readings, "timestamp");
        if (!latest) throw new Error("No readings found");
        return latest;
      }),
  ])(data);

// Фильтрация
export const filterByTimeRange = _.curry(
  (
    startTime: Date,
    endTime: Date,
    data: SensorDataPoint[]
  ): SensorDataPoint[] =>
    _.filter(data, (reading) => {
      const timestamp = reading.timestamp || new Date();
      return timestamp >= startTime && timestamp <= endTime;
    })
);

// Расчет средних значений
export const calculateAverages = (data: SensorDataPoint[]): SensorAverages => ({
  avgTemperature: _.round(_.meanBy(data, "temperature"), 2),
  avgHumidity: _.round(_.meanBy(data, "humidity"), 2),
});

// Композиция функций для получения статистики
export const getSensorStatistics = _.flow([
  createSensorData,
  (data) => ({
    readings: data,
    latestReadings: getLatestReadings(data),
    averages: calculateAverages(data),
  }),
]);

// Утилиты для работы с данными
export const formatSensorData = _.curry(
  (precision: number, data: SensorDataPoint): SensorDataPoint => ({
    ...data,
    temperature: _.round(data.temperature, precision),
    humidity: _.round(data.humidity, precision),
  })
);

export const sortByTimestamp = _.curry(
  (direction: "asc" | "desc", data: SensorDataPoint[]): SensorDataPoint[] =>
    _.orderBy(data, ["timestamp"], [direction])
);
