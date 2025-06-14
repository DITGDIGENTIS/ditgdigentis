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

      const readings = await prisma.humidityReading.findMany({
        where,
        orderBy: { timestamp: "asc" },
      });

      return _.map(readings, (r) => ({
        sensor_id: r.sensor_id,
        temperature: Number(r.temperature),
        humidity: Number(r.humidity),
        timestamp: new Date(r.timestamp),
        company_name: r.company_name,
      }));
    } finally {
      await prisma.$disconnect();
    }
  };

  const getLastOneHumidityReadings = async (
    company_name?: string
  ): Promise<SensorDataPoint[]> => {
    try {
      await prisma.$connect();

      const where: any = {};
      if (company_name) {
        where.company_name = company_name;
      }

      const readings = await prisma.humidityReading.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: 1,
      });

      if (!readings || readings.length === 0) {
        console.log("No humidity readings found");
        return [];
      }

      return _.map(readings, (r) => ({
        sensor_id: r.sensor_id,
        temperature: Number(Number(r.temperature).toFixed(2)),
        humidity: Number(Number(r.humidity).toFixed(2)),
        timestamp: new Date(r.timestamp),
        company_name: r.company_name,
      }));
    } catch (error) {
      console.error("Error fetching last humidity reading:", error);
      throw new Error("Failed to fetch last humidity reading");
    } finally {
      await prisma.$disconnect();
    }
  };

  return {
    getAggregatedHumidityReadings,
    getLastOneHumidityReadings,
  };
}
