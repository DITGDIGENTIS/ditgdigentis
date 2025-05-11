import { PrismaClient } from "../../generated/prisma";
import _ from "lodash";
import { SensorDataPoint, sortByTimestamp } from "./sensor-data.service";

export interface SensorService {
  createRecords(data: SensorDataPoint[]): Promise<void>;
  getAllReadings(): Promise<SensorDataPoint[]>;
  deleteSensorRecords(sensorId: string): Promise<number>;
}

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
          const exists = await prisma.sensorReading.findFirst({
            where: {
              sensor_id: sensor.sensor_id,
              timestamp: sensor.timestamp,
            },
          });

          if (exists) {
            console.log(`[createRecords] Skipped existing: ${sensor.sensor_id} @ ${sensor.timestamp?.toISOString()}`);
            return null;
          }

          try {
            return await prisma.sensorReading.create({
              data: {
                sensor_id: sensor.sensor_id,
                temperature: sensor.temperature,
                humidity: sensor.humidity,
                timestamp: sensor.timestamp || new Date(),
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
          humidity: true,
          timestamp: true,
        },
      });

      const formatted = readings.map((r) => ({
        sensor_id: r.sensor_id,
        temperature: Number(r.temperature),
        humidity: Number(r.humidity),
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
    deleteSensorRecords,
  };
}
