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

      console.log('Getting daily readings from DB...', filters);

      // Если дата не передана, используем текущую дату
      const queryDate = filters.startDate ? new Date(filters.startDate) : new Date();
      
      // Получаем timestamp в миллисекундах для начала и конца дня
      const startTimestamp = Date.UTC(
        queryDate.getUTCFullYear(),
        queryDate.getUTCMonth(),
        queryDate.getUTCDate(),
        0, 0, 0, 0
      );

      const endTimestamp = Date.UTC(
        queryDate.getUTCFullYear(),
        queryDate.getUTCMonth(),
        queryDate.getUTCDate(),
        23, 59, 59, 999
      );

      console.log('Timestamp range:', {
        queryDate: queryDate.toISOString(),
        startTimestamp,
        endTimestamp,
        startDate: new Date(startTimestamp).toISOString(),
        endDate: new Date(endTimestamp).toISOString()
      });

      // Сначала проверим формат данных в базе
      const sampleReading = await prisma.humidityReading.findFirst();
      console.log('Sample reading from DB:', {
        timestamp: sampleReading?.timestamp,
        timestampType: typeof sampleReading?.timestamp,
        timestampValue: sampleReading?.timestamp instanceof Date ? sampleReading.timestamp.getTime() : null
      });

      // Запрос данных за день
      const readings = await prisma.humidityReading.findMany({
        where: {
          timestamp: {
            gte: new Date(startTimestamp),
            lte: new Date(endTimestamp)
          }
        },
        orderBy: { timestamp: "asc" }
      });

      console.log('Found readings:', {
        count: readings.length,
        sample: readings.slice(0, 2).map(r => ({
          timestamp: r.timestamp,
          timestampType: typeof r.timestamp,
          timestampValue: r.timestamp instanceof Date ? r.timestamp.getTime() : null,
          sensor_id: r.sensor_id,
          humidity: r.humidity,
          temperature: r.temperature
        }))
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