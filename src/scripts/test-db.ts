import { PrismaClient } from "../../generated/prisma";

async function main() {
  console.log("Тестирование подключения к базе данных...");
  
  const prisma = new PrismaClient();
  
  try {
    console.log("Попытка подключения...");
    await prisma.$connect();
    console.log("Подключение успешно!");

    // Сначала проверим существующие записи
    const existingRecords = await prisma.humidityReading.findMany({
      orderBy: {
        timestamp: 'desc'
      },
      take: 5
    });

    console.log("Последние записи в базе:", {
      количество: existingRecords.length,
      примеры: existingRecords.map(r => ({
        sensor_id: r.sensor_id,
        timestamp: r.timestamp,
        temperature: r.temperature,
        humidity: r.humidity
      }))
    });

    // Создаем тестовые записи за последний час
    const now = new Date();
    const records = [];
    
    for (let i = 0; i < 12; i++) {
      records.push({
        sensor_id: "HUM1-1",
        humidity: 45 + Math.random() * 10,
        temperature: 22 + Math.random() * 2,
        timestamp: new Date(now.getTime() - i * 5 * 60 * 1000)
      });
    }

    console.log("Создание тестовых записей...");
    
    for (const record of records) {
      // Проверяем, нет ли уже записи с таким временем
      const exists = await prisma.humidityReading.findFirst({
        where: {
          sensor_id: record.sensor_id,
          timestamp: record.timestamp
        }
      });

      if (!exists) {
        await prisma.humidityReading.create({
          data: {
            sensor_id: record.sensor_id,
            humidity: record.humidity,
            temperature: record.temperature,
            timestamp: record.timestamp
          }
        });
        console.log("Создана запись:", {
          sensor_id: record.sensor_id,
          timestamp: record.timestamp,
          temperature: record.temperature,
          humidity: record.humidity
        });
      } else {
        console.log("Пропущена существующая запись:", {
          sensor_id: record.sensor_id,
          timestamp: record.timestamp
        });
      }
    }

    // Проверяем финальное состояние
    const finalRecords = await prisma.humidityReading.findMany({
      where: {
        timestamp: {
          gte: new Date(now.getTime() - 60 * 60 * 1000)
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    console.log("Итоговое состояние:", {
      всего_записей: finalRecords.length,
      временной_диапазон: {
        начало: finalRecords[finalRecords.length - 1]?.timestamp,
        конец: finalRecords[0]?.timestamp
      }
    });

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 