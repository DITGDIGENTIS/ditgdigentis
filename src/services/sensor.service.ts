import { PrismaClient } from "../../generated/prisma";
import * as _ from "lodash";
import { DateTime } from "luxon";
import { SensorDataPoint, SensorReadingFilters } from "@/types/sensor";

export interface SensorService {
  getAggregatedReadings(
    filters: SensorReadingFilters
  ): Promise<SensorDataPoint[]>;
  getLastFourReadings(company_name?: string): Promise<SensorDataPoint[]>;
}

export function createSensorService(): SensorService {
  const prisma = new PrismaClient();

  const getAggregatedReadings = async (
    filters: SensorReadingFilters
  ): Promise<SensorDataPoint[]> => {
    try {
      await prisma.$connect();

      const startDate = filters.startDate
        ? DateTime.fromJSDate(filters.startDate)
            .setZone("UTC")
            .startOf("day")
            .toJSDate()
        : DateTime.now().setZone("UTC").startOf("day").toJSDate();

      const endDate = filters.endDate
        ? DateTime.fromJSDate(filters.endDate)
            .setZone("UTC")
            .endOf("day")
            .toJSDate()
        : DateTime.now().setZone("UTC").endOf("day").toJSDate();

      const where: any = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (filters.sensorIds && filters.sensorIds.length > 0) {
        where.sensor_id = { in: filters.sensorIds };
      }

      if (filters.company_name) {
        where.company_name = filters.company_name;
      }

      const readings = await prisma.sensorReading.findMany({
        where,
        orderBy: { timestamp: "asc" },
      });

      const result = _.chain(readings)
        .map((r) => ({
          sensor_id: r.sensor_id,
          temperature: r.temperature !== null ? Number(r.temperature) : null,
          timestamp: new Date(r.timestamp),
        }))
        .value();

      return result;
    } catch (error) {
      throw new Error(
        `Failed to fetch sensor readings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      try {
        await prisma.$disconnect();
        console.log("[SensorService] Database connection closed");
      } catch (disconnectError) {
        console.error(
          "[SensorService] Error disconnecting from database:",
          disconnectError
        );
      }
    }
  };

  const getLastFourReadings = async (
    company_name?: string
  ): Promise<SensorDataPoint[]> => {
    try {
      await prisma.$connect();

      const lastTimestamp = await prisma.sensorReading.groupBy({
        by: ["timestamp"],
        where: company_name ? { company_name } : undefined,
        having: {
          sensor_id: {
            _count: {
              equals: 4,
            },
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 1,
      });

      if (!lastTimestamp || lastTimestamp.length === 0) {
        console.log("[SensorService] No timestamps found");
        return [];
      }

      const readings = await prisma.sensorReading.findMany({
        where: {
          timestamp: lastTimestamp[0].timestamp,
          ...(company_name ? { company_name } : {}),
        },
        orderBy: { sensor_id: "asc" },
      });

      const result = _.chain(readings)
        .map((r) => ({
          sensor_id: r.sensor_id,
          temperature: r.temperature !== null ? Number(r.temperature) : null,
          timestamp: new Date(r.timestamp),
        }))
        .value();

      return result;
    } catch (error) {
      throw new Error(
        `Failed to fetch last four readings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      try {
        await prisma.$disconnect();
        console.log("[SensorService] Database connection closed");
      } catch (disconnectError) {
        console.error(
          "[SensorService] Error disconnecting from database:",
          disconnectError
        );
      }
    }
  };

  return {
    getAggregatedReadings,
    getLastFourReadings,
  };
}
