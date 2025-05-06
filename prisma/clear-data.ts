import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearData() {
  try {
    // Удаляем все записи из таблицы SensorReading
    const deletedCount = await prisma.sensorReading.deleteMany();
    
    console.log(`Успешно удалено ${deletedCount.count} записей`);
  } catch (error) {
    console.error("Ошибка при удалении данных:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearData(); 