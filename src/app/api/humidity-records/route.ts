import { NextRequest, NextResponse } from "next/server";
import { createHumidityService, HumidityDataPoint } from "@/services/humidity.service";
import _ from "lodash";
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[POST /api/humidity-records] Получен запрос:", {
      body,
      headers: Object.fromEntries(request.headers.entries())
    });

    // Если это запрос на получение данных по датам с интервалом
    if (body.startDate && body.endDate && body.intervalSeconds) {
      const { startDate, endDate, sensorIds, intervalSeconds } = body;
      console.log("[POST /api/humidity-records] Запрос данных за период с интервалом:", {
        startDate: new Date(startDate).toLocaleString(),
        endDate: new Date(endDate).toLocaleString(),
        sensorIds,
        intervalSeconds
      });

      // Преобразуем даты в формат PostgreSQL
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate).toISOString();

      // SQL запрос с интервальной группировкой
      const result = await sql`
        WITH time_series AS (
          SELECT generate_series(
            ${start}::timestamp,
            ${end}::timestamp,
            (${intervalSeconds} || ' seconds')::interval
          ) AS timestamp
        ),
        sensor_data AS (
          SELECT 
            date_trunc('second', timestamp) as timestamp,
            sensor_id,
            AVG(temperature)::numeric(10,2) as temperature,
            AVG(humidity)::numeric(10,2) as humidity
          FROM sensor_readings
          WHERE 
            timestamp >= ${start}
            AND timestamp < ${end}
            AND sensor_id = ANY(${sensorIds})
          GROUP BY 
            date_trunc('second', timestamp),
            sensor_id
        )
        SELECT 
          ts.timestamp,
          COALESCE(sd.sensor_id, ${sensorIds[0]}) as sensor_id,
          COALESCE(sd.temperature, NULL) as temperature,
          COALESCE(sd.humidity, NULL) as humidity
        FROM time_series ts
        LEFT JOIN sensor_data sd ON ts.timestamp = sd.timestamp
        ORDER BY ts.timestamp ASC;
      `;

      console.log(`[POST /api/humidity-records] Найдено ${result.rows.length} записей`);
      return NextResponse.json(result.rows);
    }
    
    // Если это запрос на получение данных по датам без интервала
    if (body.startDate && body.endDate) {
      console.log("[POST /api/humidity-records] Запрос данных за период:", {
        startDate: new Date(body.startDate).toLocaleString(),
        endDate: new Date(body.endDate).toLocaleString(),
        sensorIds: body.sensorIds
      });
      
      const service = createHumidityService();
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
    const service = createHumidityService();
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