import { PrismaClient } from "@prisma/client";
import _ from "lodash";

const prisma = new PrismaClient();

interface SensorData {
  sensor_id: string;
  temperature: number;
  humidity: number;
  timestamp?: Date;
}

/**
 * Добавляет временную метку к данным сенсора, если она отсутствует
 */
const addTimestamp = (data: SensorData): SensorData => ({
  ...data,
  timestamp: data.timestamp || new Date(),
});

/**
 * Сохраняет данные сенсора в базу данных
 * @param data Данные сенсора
 * @returns Сохраненная запись
 */
export const saveSensorData = async (data: SensorData) => {
  try {
    const sensorData = addTimestamp(data);
    return await prisma.sensorReading.create({ data: sensorData });
  } catch (error) {
    console.error("Ошибка при сохранении данных сенсора:", error);
    throw error;
  }
};

/**
 * Сохраняет массив данных сенсоров в базу данных
 * @param dataArray Массив данных сенсоров
 * @returns Количество сохраненных записей
 */
export const saveMultipleSensorData = async (dataArray: SensorData[]) => {
  try {
    const sensorDataArray = _.map(dataArray, addTimestamp);
    const result = await prisma.sensorReading.createMany({
      data: sensorDataArray,
    });
    return result.count;
  } catch (error) {
    console.error("Ошибка при сохранении массива данных сенсоров:", error);
    throw error;
  }
};

/**
 * Получает последние данные сенсора
 * @param sensorId ID сенсора
 * @param limit Количество последних записей
 * @returns Массив последних записей сенсора
 */
export const getLatestSensorData = async (sensorId: string, limit: number = 10) => {
  try {
    return await prisma.sensorReading.findMany({
      where: { sensor_id: sensorId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("Ошибка при получении последних данных сенсора:", error);
    throw error;
  }
}; 