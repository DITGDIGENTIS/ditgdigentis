import { PrismaClient } from "../../generated/prisma";
import * as _ from "lodash";
import { DateTime } from "luxon";
import { SensorDataPoint, SensorReadingFilters } from "@/types/sensor";

export interface HumidityService {
  getAggregatedHumidityReadings(
    filters: SensorReadingFilters
  ): Promise<SensorDataPoint[]>;
  getLastOneHumidityReadings(company_name?: string): Promise<SensorDataPoint[]>;
}

export function createHumidityService(): HumidityService {
  const prisma = new PrismaClient();

  const getAggregatedHumidityReadings = async (
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

      const where: {
        timestamp: {
          gte: Date;
          lte: Date;
        };
        sensor_id?: { in: string[] };
        company_name?: string;
      } = {
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

      const readings = await prisma.humidityReading.findMany({
        where,
        orderBy: { timestamp: "asc" },
      });

      return _.chain(readings)
        .map((r) => ({
          sensor_id: r.sensor_id,
          temperature: r.temperature !== null ? Number(r.temperature) : null,
          humidity: r.humidity !== null ? Number(r.humidity) : null,
          timestamp: new Date(r.timestamp),
          company_name: r.company_name,
        }))
        .value();
    } catch (error) {
      throw new Error(
        `Failed to fetch humidity readings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error(
          "[HumidityService] Error disconnecting from database:",
          disconnectError
        );
      }
    }
  };

  const getLastOneHumidityReadings = async (
    company_name?: string
  ): Promise<SensorDataPoint[]> => {
    try {
      await prisma.$connect();

      const where: { company_name?: string } = {};
      if (company_name) {
        where.company_name = company_name;
      }

      const readings = await prisma.humidityReading.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: 1,
      });

      if (_.isEmpty(readings)) {
        return [];
      }

      return _.chain(readings)
        .map((r) => ({
          sensor_id: r.sensor_id,
          temperature: r.temperature !== null ? Number(Number(r.temperature).toFixed(2)) : null,
          humidity: r.humidity !== null ? Number(Number(r.humidity).toFixed(2)) : null,
          timestamp: new Date(r.timestamp),
          company_name: r.company_name,
        }))
        .value();
    } catch (error) {
      throw new Error(
        `Failed to fetch last humidity reading: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error(
          "[HumidityService] Error disconnecting from database:",
          disconnectError
        );
      }
    }
  };

  return {
    getAggregatedHumidityReadings,
    getLastOneHumidityReadings,
  };
}