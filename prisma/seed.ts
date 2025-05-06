import { PrismaClient } from "@prisma/client";
import _ from "lodash";

const prisma = new PrismaClient();

async function main() {
  // Очищаем существующие данные
  await prisma.sensorReading.deleteMany();

  // Создаем массив сенсоров
  const sensors = ["sensor_1", "sensor_2", "sensor_3"];

  // Генерируем данные за последние 24 часа
  const now = new Date();
  const hours = _.range(0, 24);

  // Создаем тестовые данные для каждого сенсора
  for (const sensorId of sensors) {
    const readings = _.map(hours, (hour: number) => {
      const timestamp = new Date(now.getTime() - hour * 60 * 60 * 1000);
      return {
        sensor_id: sensorId,
        timestamp,
        // Генерируем реалистичные значения температуры (15-30°C)
        temperature: _.random(15, 30, true),
        // Генерируем реалистичные значения влажности (30-70%)
        humidity: _.random(30, 70, true),
      };
    });

    // Создаем записи в базе данных
    await prisma.sensorReading.createMany({
      data: readings,
    });
  }

  console.log("Тестовые данные успешно созданы");
}

main()
  .catch((e) => {
    console.error("Ошибка при создании тестовых данных:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
