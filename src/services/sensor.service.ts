import { PrismaClient } from "../../generated/prisma";
import * as _ from "lodash";
import { SensorDataPoint } from "./sensor-data.service";

export interface SensorService {
  getAggregatedReadings(
    filters: SensorReadingFilters
  ): Promise<SensorDataPoint[]>;
  getLastFourReadings(sensorId?: string): Promise<SensorDataPoint[]>;
}

type SensorReadingFilters = {
  startDate?: Date;
  endDate?: Date;
  sensorIds?: string[];
};

export function createSensorService(): SensorService {
  const prisma = new PrismaClient();

  const getAggregatedReadings = async (
    filters: SensorReadingFilters
  ): Promise<SensorDataPoint[]> => {
    try {
      await prisma.$connect();

      const startDate = filters.startDate
        ? new Date(filters.startDate)
        : new Date();
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

      const startTimestamp = Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        0,
        0,
        0,
        0
      );
      const endTimestamp = Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        23,
        59,
        59,
        999
      );

      const where: any = {
        timestamp: {
          gte: new Date(startTimestamp),
          lte: new Date(endTimestamp),
        },
      };
      if (filters.sensorIds && filters.sensorIds.length > 0) {
        where.sensor_id = { in: filters.sensorIds };
      }

      const readings = await prisma.sensorReading.findMany({
        where,
        orderBy: { timestamp: "asc" },
      });

      return _.map(readings, (r) => ({
        sensor_id: r.sensor_id,
        temperature: Number(r.temperature),
        timestamp: new Date(r.timestamp),
      }));
    } finally {
      await prisma.$disconnect();
    }
  };

  const getLastFourReadings = async (
    sensorId?: string
  ): Promise<SensorDataPoint[]> => {
    try {
      await prisma.$connect();

      // Получаем последние timestamp'ы, где есть данные для всех сенсоров
      const timestamps = await prisma.$queryRaw<{ timestamp: Date }[]>`
        SELECT timestamp
        FROM "SensorReading"
        WHERE timestamp IN (
          SELECT timestamp
          FROM "SensorReading"
          GROUP BY timestamp
          HAVING COUNT(DISTINCT sensor_id) = 4
        )
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      if (!timestamps || !timestamps[0]) {
        return [];
      }

      const lastTimestamp = timestamps[0].timestamp;

      const readings = await prisma.sensorReading.findMany({
        where: {
          timestamp: lastTimestamp
        },
        orderBy: { sensor_id: "asc" }
      });

      return _.chain(readings)
        .map((r) => ({
          sensor_id: r.sensor_id,
          temperature: Number(Number(r.temperature).toFixed(2)),
          timestamp: new Date(r.timestamp),
        }))
        .value();
    } catch (error) {
      console.error("Error fetching last four readings:", error);
      throw new Error("Failed to fetch last four readings");
    } finally {
      await prisma.$disconnect();
    }
  };

  return {
    getAggregatedReadings,
    getLastFourReadings,
  };
}
