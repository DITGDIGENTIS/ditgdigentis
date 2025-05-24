import { PrismaClient } from "../../generated/prisma";
import _ from "lodash";
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

      console.log('Getting readings from DB...', filters);

      // Если даты не переданы, используем текущую дату
      const startDate = filters.startDate ? new Date(filters.startDate) : new Date();
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
      
      // Получаем timestamp в миллисекундах для начала и конца периода
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

      console.log('Timestamp range:', {
        startDate: new Date(startTimestamp).toISOString(),
        endDate: new Date(endTimestamp).toISOString()
      });

      // Запрос данных за период
      const readings = await prisma.humidityReading.findMany({
        where: {
          timestamp: {
            gte: new Date(startTimestamp),
            lte: new Date(endTimestamp)
          }
        },
        orderBy: { timestamp: "asc" }
      });

      if (_.isEmpty(readings)) return [];

      // Преобразуем данные в формат для графика
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