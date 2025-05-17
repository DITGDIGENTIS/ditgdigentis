import { PrismaClient } from "../../generated/prisma";
import _ from "lodash";

export interface HumidityDataPoint {
  sensor_id: string;
  humidity: number;
  temperature: number;
  timestamp?: Date;
}

export interface ReadingFilters {
  startDate?: Date;
  endDate?: Date;
  sensorIds?: string[];
  limit?: number;
  offset?: number;
}

export interface HumidityService {
  createRecords(data: HumidityDataPoint[]): Promise<void>;
  getAllReadings(filters?: ReadingFilters): Promise<HumidityDataPoint[]>;
  deleteSensorRecords(sensorId: string): Promise<number>;
}

export function createHumidityService(): HumidityService {
  console.log("[DEBUG] Database URL:", process.env.DATABASE_URL);
  const prisma = new PrismaClient();

  const createRecords = async (data: HumidityDataPoint[]): Promise<void> => {
    if (!_.isArray(data) || _.isEmpty(data)) {
      console.warn("[createRecords] Empty input");
      return;
    }

    try {
      await prisma.$connect();

      const result = await Promise.all(
        _.map(data, async (sensor) => {
          const sensorTimestamp = sensor.timestamp instanceof Date
            ? sensor.timestamp
            : new Date(sensor.timestamp!);

          const exists = await prisma.humidityReading.findFirst({
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
            return await prisma.humidityReading.create({
              data: {
                sensor_id: sensor.sensor_id,
                humidity: sensor.humidity,
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

      console.log(`[createRecords] Inserted ${_.filter(result, Boolean).length} new records`);
    } catch (err) {
      console.error("[createRecords] Unexpected error:", err);
      throw err;
    } finally {
      await prisma.$disconnect();
    }
  };

  const getAllReadings = async (filters?: ReadingFilters): Promise<HumidityDataPoint[]> => {
    try {
      await prisma.$connect();

      const where: any = {};

      if (filters?.startDate) {
        where.timestamp = {
          ...where.timestamp,
          gte: new Date(filters.startDate)
        };
      }

      if (filters?.endDate) {
        where.timestamp = {
          ...where.timestamp,
          lte: new Date(filters.endDate)
        };
      }

      if (filters?.sensorIds && filters.sensorIds.length > 0) {
        where.sensor_id = {
          in: filters.sensorIds
        };
      }

      const readings = await prisma.humidityReading.findMany({
        where,
        orderBy: { timestamp: "desc" },
        select: {
          sensor_id: true,
          humidity: true,
          temperature: true,
          timestamp: true,
        },
        take: filters?.limit,
        skip: filters?.offset,
      });

      const formatted = _.map(readings, (r) => ({
        sensor_id: r.sensor_id,
        humidity: Number(r.humidity),
        temperature: Number(r.temperature),
        timestamp: r.timestamp,
      }));

      return _.orderBy(formatted, ['timestamp'], ['desc']);
    } catch (err) {
      console.error("[getAllReadings] Error:", err);
      throw err;
    } finally {
      await prisma.$disconnect();
    }
  };

  const deleteSensorRecords = async (sensorId: string): Promise<number> => {
    try {
      await prisma.$connect();
      const result = await prisma.humidityReading.deleteMany({
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
    deleteSensorRecords,
  };
} 