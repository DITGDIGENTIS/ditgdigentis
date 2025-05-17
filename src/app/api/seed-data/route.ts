import { NextResponse } from "next/server";
import { createHumidityService } from "@/services/humidity.service";

export async function GET() {
  try {
    const service = createHumidityService();
    
    // Создаем записи за последний час с интервалом 5 минут
    const now = new Date();
    const records = [];
    
    // Генерируем данные за последний час
    for (let i = 0; i < 12; i++) {
      const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000));
      
      // Генерируем реалистичные значения
      const temperature = 22 + Math.random() * 2; // 22-24°C
      const humidity = 45 + Math.random() * 10; // 45-55%
      
      records.push({
        sensor_id: "HUM1-1",
        timestamp,
        temperature,
        humidity
      });
    }
    
    console.log("[SEED] Создание тестовых записей:", {
      количество: records.length,
      пример: records[0]
    });

    await service.createRecords(records);
    
    return NextResponse.json({
      success: true,
      message: `Создано ${records.length} тестовых записей`
    });
    
  } catch (error: any) {
    console.error("[SEED] Ошибка:", error);
    return NextResponse.json(
      { error: "Ошибка создания тестовых данных", details: error.message },
      { status: 500 }
    );
  }
} 