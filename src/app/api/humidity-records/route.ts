import { NextRequest, NextResponse } from "next/server";
import { createHumidityService } from "@/services/humidity.service";
import _ from "lodash";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[POST /api/humidity-records] Получен запрос:", {
      body,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    });

    const service = createHumidityService();
    console.log("[POST /api/humidity-records] Сервис создан");

    // Если это запрос на получение данных по датам
    if (body.startDate && body.endDate) {
      console.log("[POST /api/humidity-records] Запрос данных за период:", {
        startDate: new Date(body.startDate).toLocaleString(),
        endDate: new Date(body.endDate).toLocaleString(),
        sensorIds: body.sensorIds
      });
      
      const readings = await service.getAggregatedReadings({
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        sensorIds: body.sensorIds
      });
      
      console.log(`[POST /api/humidity-records] Найдено ${readings.length} записей:`, {
        количество: readings.length,
        примеры: readings.slice(0, 3),
        временной_диапазон: readings.length > 0 ? {
          первая: new Date(readings[0].timestamp).toLocaleString(),
          последняя: new Date(readings[readings.length - 1].timestamp).toLocaleString()
        } : null,
        параметры_запроса: {
          startDate: new Date(body.startDate).toLocaleString(),
          endDate: new Date(body.endDate).toLocaleString(),
          sensorIds: body.sensorIds
        }
      });

      return NextResponse.json(readings);
    }

    // Если это запрос на создание записей
    const data = _.isArray(body) ? body : [body];
    console.log("[POST /api/humidity-records] Подготовка данных для сохранения:", {
      количество: data.length,
      примеры: data.slice(0, 2),
      timestamp: new Date().toISOString()
    });

    await service.createRecords(data);
    console.log("[POST /api/humidity-records] Данные успешно сохранены");
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/humidity-records] Ошибка:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      name: error?.name,
      details: error?.details || "No additional details",
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: "Internal server error", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sensorId = searchParams.get("sensorId");

    if (!sensorId) {
      return NextResponse.json(
        { error: "Sensor ID is required" },
        { status: 400 }
      );
    }

    const service = createHumidityService();
    const deletedCount = await service.deleteSensorRecords(sensorId);

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("[DELETE /api/humidity-records] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 