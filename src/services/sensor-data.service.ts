import * as _ from "lodash";

export type SensorDataPoint = {
  sensor_id: string;
  temperature: number;
  timestamp: Date;
};

export type SensorDataBatch = {
  sensors: Partial<SensorDataPoint>[];
};

export type SensorAverages = {
  avgTemperature: number;
};

export const validateSensorData = (data: Partial<SensorDataPoint>): boolean => {
  if (!data || typeof data !== "object") return false;

  const isValidTimestamp = (timestamp: any): boolean => {
    if (!timestamp) return true;
    const d = new Date(timestamp);
    return !isNaN(d.getTime());
  };

  return (
    typeof data.sensor_id === "string" &&
    data.sensor_id.length > 0 &&
    typeof data.temperature === "number" &&
    !isNaN(data.temperature) &&
    isValidTimestamp(data.timestamp)
  );
};

export const validateBatch = (batch: SensorDataBatch): boolean =>
  Array.isArray(batch?.sensors) &&
  batch.sensors.length > 0 &&
  batch.sensors.every(validateSensorData);

export const createSensorData = (data: SensorDataBatch): SensorDataPoint[] => {
  if (!validateBatch(data)) {
    throw new Error("Invalid sensor data format");
  }

  return data.sensors.map((sensor) => {
    const date =
      sensor.timestamp instanceof Date
        ? sensor.timestamp
        : new Date(sensor.timestamp || Date.now());

    return {
      sensor_id: String(sensor.sensor_id),
      temperature: Number(_.round(sensor.temperature ?? 0, 2)),
      timestamp: date,
    };
  });
};

export const groupBySensorId = (
  data: SensorDataPoint[]
): Record<string, SensorDataPoint[]> => _.groupBy(data, "sensor_id");

export const getLatestReadings = (
  data: SensorDataPoint[]
): Record<string, SensorDataPoint> =>
  _.mapValues(groupBySensorId(data), (group) => _.maxBy(group, "timestamp")!);

export const filterByTimeRange = _.curry(
  (
    startTime: Date,
    endTime: Date,
    data: SensorDataPoint[]
  ): SensorDataPoint[] =>
    data.filter(
      (reading) =>
        reading.timestamp >= startTime && reading.timestamp <= endTime
    )
);

export const calculateAverages = (data: SensorDataPoint[]): SensorAverages => ({
  avgTemperature: _.round(_.meanBy(data, "temperature"), 2),
});

export const getSensorStatistics = _.flow([
  createSensorData,
  (data) => ({
    readings: data,
    latestReadings: getLatestReadings(data),
    averages: calculateAverages(data),
  }),
]);

export const formatSensorData = _.curry(
  (precision: number, data: SensorDataPoint): SensorDataPoint => ({
    ...data,
    temperature: _.round(data.temperature, precision),
  })
);

export const sortByTimestamp = _.curry(
  (direction: "asc" | "desc", data: SensorDataPoint[]): SensorDataPoint[] =>
    _.orderBy(data, ["timestamp"], [direction])
);
