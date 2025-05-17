import { NextRequest, NextResponse } from "next/server";
import { createHumidityService, HumidityDataPoint } from "@/services/humidity.service";
import _ from "lodash";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[POST /api/humidity-records] Получен запрос:", {
      body,
      headers: Object.fromEntries(request.headers.entries())
    });
    
    const service = createHumidityService();

    // Если это запрос на получение данных по датам
    if (body.startDate && body.endDate) {
      console.log("[POST /api/humidity-records] Запрос данных за период:", {
        startDate: new Date(body.startDate).toLocaleString(),
        endDate: new Date(body.endDate).toLocaleString(),
        sensorIds: body.sensorIds
      });
      
      const readings = await service.getAllReadings({
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        sensorIds: body.sensorIds
      });
      
      console.log(`[POST /api/humidity-records] Найдено ${readings.length} записей:`, {
        примеры: readings.slice(0, 3),
        временной_диапазон: readings.length > 0 ? {
          первая: new Date(readings[0].timestamp).toLocaleString(),
          последняя: new Date(readings[readings.length - 1].timestamp).toLocaleString()
        } : null
      });

      return NextResponse.json(readings);
    }

    // Если это запрос на создание записей
    const data = _.isArray(body) ? body : [body];
    if (!_.every(data, (item): item is HumidityDataPoint => {
      return _.isString(item.sensor_id) && 
             _.isNumber(item.humidity) && 
             _.isNumber(item.temperature) &&
             item.humidity >= 0 && 
             item.humidity <= 100;
    })) {
      console.log("[POST /api/humidity-records] Неверный формат данных:", data);
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    await service.createRecords(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/humidity-records] Ошибка:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json(
      { error: "Internal server error", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const service = createHumidityService();
    const readings = await service.getAllReadings();
    return NextResponse.json(readings);
  } catch (error) {
    console.error("[GET /api/humidity-records] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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