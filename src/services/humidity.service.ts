import { PrismaClient } from "../../generated/prisma";
import _ from "lodash";

export interface HumidityDataPoint {
  sensor_id: string;
  humidity: number;
  temperature: number;
  timestamp: number | Date;
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
      console.warn("[DB] Пустой массив данных для сохранения");
      return;
    }

    try {
      console.log("[DB] Подключение к базе данных...");
      await prisma.$connect();
      console.log("[DB] Подключение успешно установлено");

      console.log("[DB] Начало сохранения записей:", {
        количество: data.length,
        примеры: data.slice(0, 2),
        timestamp: new Date().toISOString()
      });

      const result = await Promise.all(
        _.map(data, async (sensor) => {
          const sensorTimestamp = sensor.timestamp instanceof Date
            ? sensor.timestamp
            : new Date(sensor.timestamp!);

          console.log("[DB] Проверка существующей записи:", {
            sensor_id: sensor.sensor_id,
            timestamp: sensorTimestamp.toISOString(),
            humidity: sensor.humidity,
            temperature: sensor.temperature
          });

          const exists = await prisma.humidityReading.findFirst({
            where: {
              sensor_id: sensor.sensor_id,
              timestamp: sensorTimestamp,
            },
          });

          if (exists) {
            console.log("[DB] Найдена существующая запись:", {
              id: exists.id,
              sensor_id: exists.sensor_id,
              timestamp: exists.timestamp.toISOString()
            });
            return null;
          }

          try {
            console.log("[DB] Создание новой записи:", {
              sensor_id: sensor.sensor_id,
              timestamp: sensorTimestamp.toISOString(),
              humidity: sensor.humidity,
              temperature: sensor.temperature
            });

            const newRecord = await prisma.humidityReading.create({
              data: {
                sensor_id: sensor.sensor_id,
                humidity: sensor.humidity,
                temperature: sensor.temperature,
                timestamp: sensorTimestamp,
              },
            });

            console.log("[DB] Запись успешно создана:", {
              id: newRecord.id,
              sensor_id: newRecord.sensor_id,
              timestamp: newRecord.timestamp.toISOString()
            });

            return newRecord;
          } catch (err) {
            console.error("[DB] Ошибка создания записи:", {
              error: err,
              data: sensor
            });
            return null;
          }
        })
      );

      const successCount = _.filter(result, Boolean).length;
      console.log("[DB] Итоги сохранения:", {
        всего: data.length,
        успешно: successCount,
        пропущено: data.length - successCount,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("[DB] Критическая ошибка:", err);
      throw err;
    } finally {
      await prisma.$disconnect();
    }
  };

  const getAllReadings = async (filters?: ReadingFilters): Promise<HumidityDataPoint[]> => {
    try {
      console.log("[getAllReadings] Подключение к базе данных...");
      await prisma.$connect();
      console.log("[getAllReadings] Подключение успешно");

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

      console.log("[getAllReadings] Параметры запроса:", {
        where,
        filters
      });

      const readings = await prisma.humidityReading.findMany({
        where,
        orderBy: { timestamp: "asc" },
        select: {
          sensor_id: true,
          humidity: true,
          temperature: true,
          timestamp: true,
        },
        take: filters?.limit,
        skip: filters?.offset,
      });

      console.log(`[getAllReadings] Найдено ${readings.length} записей:`, {
        количество: readings.length,
        примеры: readings.slice(0, 3),
        параметры_запроса: where
      });

      const formatted = _.map(readings, (r) => ({
        sensor_id: r.sensor_id,
        humidity: Number(r.humidity),
        temperature: Number(r.temperature),
        timestamp: r.timestamp.getTime()
      }));

      return formatted;
    } catch (err) {
      console.error("[getAllReadings] Ошибка:", err);
      throw err;
    } finally {
      await prisma.$disconnect();
    }
  };

  return {
    createRecords,
    getAllReadings,
    deleteSensorRecords: async (sensorId: string) => {
      try {
        await prisma.$connect();
        const result = await prisma.humidityReading.deleteMany({
          where: { sensor_id: sensorId },
        });
        return result.count;
      } catch (err) {
        console.error("[deleteSensorRecords] Ошибка:", err);
        throw err;
      } finally {
        await prisma.$disconnect();
      }
    }
  };
} 