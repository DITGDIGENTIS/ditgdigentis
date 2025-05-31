import { PrismaClient } from "../../generated/prisma";
import * as _ from "lodash";
import { SensorDataPoint, sortByTimestamp } from "./sensor-data.service";

export interface SensorService {
  createRecords(data: SensorDataPoint[]): Promise<void>;
  getAllReadings(): Promise<SensorDataPoint[]>;
  getAggregatedReadings(filters: SensorReadingFilters): Promise<SensorDataPoint[]>;
  deleteSensorRecords(sensorId: string): Promise<number>;
}

type SensorReadingFilters = {
  startDate?: Date;
  endDate?: Date;
  sensorIds?: string[];
};

export function createSensorService(): SensorService {
  const prisma = new PrismaClient();

  const createRecords = async (data: SensorDataPoint[]): Promise<void> => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("[createRecords] Empty input");
      return;
    }

    try {
      await prisma.$connect();

      const result = await Promise.all(
        data.map(async (sensor) => {
          const sensorTimestamp = sensor.timestamp instanceof Date
            ? sensor.timestamp
            : new Date(sensor.timestamp!);

          const exists = await prisma.sensorReading.findFirst({
            where: {
              sensor_id: sensor.sensor_id,
              timestamp: sensorTimestamp,
            },
          });

          if (exists) {
            console.log(`[createRecords] Skipped existing: ${sensor.sensor_id} @ ${sensorTimestamp.toISOString()}`);
            return null;
          }

          try {
            return await prisma.sensorReading.create({
              data: {
                sensor_id: sensor.sensor_id,
                temperature: sensor.temperature,
                timestamp: sensorTimestamp,
              },
            });
          } catch (err) {
            console.error("[createRecords] Failed to save", sensor.sensor_id, err);
            return null;
          }
        })
      );

      console.log(`[createRecords] Inserted ${result.filter(Boolean).length} new records`);
    } catch (err) {
      console.error("[createRecords] Unexpected error:", err);
      throw err;
    } finally {
      await prisma.$disconnect();
    }
  };

  const getAllReadings = async (): Promise<SensorDataPoint[]> => {
    try {
      await prisma.$connect();

      const readings = await prisma.sensorReading.findMany({
        orderBy: { timestamp: "desc" },
        select: {
          sensor_id: true,
          temperature: true,
          timestamp: true,
        },
      });

      const formatted = readings.map((r) => ({
        sensor_id: r.sensor_id,
        temperature: Number(r.temperature),
        timestamp: new Date(r.timestamp),
      }));

      return sortByTimestamp("desc")(formatted);
    } catch (err) {
      console.error("[getAllReadings] Error:", err);
      throw err;
    } finally {
      await prisma.$disconnect();
    }
  };

  const getAggregatedReadings = async (filters: SensorReadingFilters): Promise<SensorDataPoint[]> => {
    try {
      await prisma.$connect();

      const startDate = filters.startDate ? new Date(filters.startDate) : new Date();
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

      const startTimestamp = Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        0, 0, 0, 0
      );
      const endTimestamp = Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        23, 59, 59, 999
      );

      // Формируем where для запроса
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

      // Преобразуем к нужному формату
      return readings.map((r) => ({
        sensor_id: r.sensor_id,
        temperature: Number(r.temperature),
        timestamp: new Date(r.timestamp),
      }));
    } finally {
      await prisma.$disconnect();
    }
  };

  const deleteSensorRecords = async (sensorId: string): Promise<number> => {
    try {
      await prisma.$connect();
      const result = await prisma.sensorReading.deleteMany({
        where: { sensor_id: sensorId },
      });
      return result.count;
    } catch (err) {
      console.error("[deleteSensorRecords] Error:", err);
      throw err;
    } finally {
      await prisma.$disconnect();
    }
  };

  return {
    createRecords,
    getAllReadings,
    getAggregatedReadings,
    deleteSensorRecords,
  };
}
