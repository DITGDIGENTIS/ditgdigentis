import { NextResponse } from "next/server";
import {
  createHumidityService,
  ReadingFilters,
} from "@/services/humidity.service";
import _ from "lodash";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: ReadingFilters = {};

    // Парсим параметры фильтрации
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sensorIds = searchParams.get("sensorIds");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Применяем фильтры если они есть
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    if (sensorIds) {
      filters.sensorIds = sensorIds.split(",");
    }
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }
    if (offset) {
      filters.offset = parseInt(offset, 10);
    }

    const service = createHumidityService();
    const readings = await service.getAllReadings(filters);

    return NextResponse.json(readings);
  } catch (error) {
    console.error("[GET /api/humidity-readings] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
