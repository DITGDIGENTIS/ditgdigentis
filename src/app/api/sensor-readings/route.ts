import { NextRequest, NextResponse } from "next/server";
import { createSensorService } from "@/services/sensor.service";

export async function GET(request: NextRequest) {
  const start = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sensorIds = searchParams.getAll("sensorIds");

    console.log("API: Starting to fetch sensor readings", { startDate, endDate, sensorIds });

    const sensorService = createSensorService();
    const readings = await sensorService.getAggregatedReadings({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      sensorIds: sensorIds.length > 0 ? sensorIds : undefined,
    });

    console.log(`API: Sensor service returned ${readings.length} entries`);

    if (!Array.isArray(readings) || readings.length === 0) {
      console.warn("API: No sensor readings found");
      return NextResponse.json([]);
    }

    // Фильтрация и сортировка валидных данных
    const validReadings = readings.filter((r) => {
      if (!r.timestamp) return false;
      const ts = new Date(r.timestamp).getTime();
      return !isNaN(ts);
    });

    const sorted = validReadings.sort(
      (a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime()
    );

    console.log(`API: Sorted ${sorted.length} valid entries`);
    console.log(`API: Total time: ${Date.now() - start}ms`);

    return NextResponse.json(sorted);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("API: Error fetching sensor readings:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });

    return NextResponse.json(
      { error: "Failed to fetch sensor readings", details: err.message },
      { status: 500 }
    );
  }
}
