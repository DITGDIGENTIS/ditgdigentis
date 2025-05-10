import { PrismaClient } from "../../generated/prisma";

export class CleanupService {
  private prisma: PrismaClient;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 10 * 60 * 60 * 1000; // 10 часов в миллисекундах

  constructor() {
    this.prisma = new PrismaClient();
  }

  public async startCleanupService() {
    console.log('Starting cleanup service...');
    
    // Запускаем очистку сразу при старте
    await this.cleanupOldData();
    
    // Устанавливаем интервал очистки
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupOldData();
    }, this.CLEANUP_INTERVAL);
  }

  public stopCleanupService() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Cleanup service stopped');
    }
  }

  private async cleanupOldData() {
    try {
      console.log('Starting data cleanup...');
      
      // Получаем текущую дату
      const now = new Date();
      
      // Вычисляем дату 10 часов назад
      const tenHoursAgo = new Date(now.getTime() - this.CLEANUP_INTERVAL);
      
      // Удаляем старые записи
      const result = await this.prisma.sensorReading.deleteMany({
        where: {
          timestamp: {
            lt: tenHoursAgo
          }
        }
      });

      console.log(`Cleanup completed. Deleted ${result.count} records older than ${tenHoursAgo.toISOString()}`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Создаем и экспортируем единственный экземпляр сервиса
export const cleanupService = new CleanupService(); 