import { PrismaClient } from "../../generated/prisma";
import _ from "lodash";
import moment from "moment";
import { HumidityService, HumidityDataPoint, AggregatedDataPoint, ReadingFilters } from "@/types/humidity";

export function createHumidityService(): HumidityService {
  const prisma = new PrismaClient();

  const createRecords = async (data: HumidityDataPoint[]): Promise<void> => {
    if (!_.isArray(data) || _.isEmpty(data)) return;

    try {
      await prisma.$connect();
      await Promise.all(
        _.map(data, async (sensor) => {
          const sensorTimestamp = sensor.timestamp instanceof Date
            ? sensor.timestamp
            : new Date(sensor.timestamp!);

          const exists = await prisma.humidityReading.findFirst({
            where: { sensor_id: sensor.sensor_id, timestamp: sensorTimestamp },
          });

          if (exists) return null;

          try {
            return await prisma.humidityReading.create({
              data: {
                sensor_id: sensor.sensor_id,
                humidity: sensor.humidity,
                temperature: sensor.temperature,
                timestamp: sensorTimestamp,
              },
            });
          } catch {
            return null;
          }
        })
      );
    } finally {
      await prisma.$disconnect();
    }
  };

  const getAggregatedReadings = async (filters: ReadingFilters): Promise<AggregatedDataPoint[]> => {
    try {
      await prisma.$connect();

      const startDate = filters.startDate ? moment(filters.startDate) : moment();
      const startOfDay = startDate.startOf('day').toDate();
      const endOfDay = startDate.endOf('day').toDate();

      const readings = await prisma.humidityReading.findMany({
        where: {
          timestamp: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        orderBy: { timestamp: "asc" }
      });

      if (_.isEmpty(readings)) return [];

      return readings.map(reading => ({
        timestamp: reading.timestamp instanceof Date ? reading.timestamp.getTime() : new Date(reading.timestamp).getTime(),
        time: (reading.timestamp instanceof Date ? reading.timestamp : new Date(reading.timestamp)).toLocaleString("uk-UA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }),
        [`${reading.sensor_id}_humidity`]: reading.humidity,
        [`${reading.sensor_id}_temperature`]: reading.temperature
      }));

    } finally {
      await prisma.$disconnect();
    }
  };

  return {
    createRecords,
    getAggregatedReadings,
    deleteSensorRecords: async (sensorId: string) => {
      try {
        await prisma.$connect();
        const result = await prisma.humidityReading.deleteMany({ where: { sensor_id: sensorId } });
        return result.count;
      } finally {
        await prisma.$disconnect();
      }
    }
  };
} 