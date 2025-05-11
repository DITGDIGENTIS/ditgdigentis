import { NextResponse } from "next/server";
import { createSensorService } from "@/services/sensor.service";

export async function GET() {
  try {
    console.log("API: Starting to fetch sensor readings");

    const sensorService = createSensorService();
    console.log("API: Sensor service created");

    const readings = await sensorService.getAllReadings();
    console.log("API: Readings fetched:", readings.length, "entries");

    if (!Array.isArray(readings) || readings.length === 0) {
      console.warn("API: No sensor readings found");
      return NextResponse.json([]);
    }

    // Вернем отсортированные по времени данные (опционально)
    const sorted = readings.sort(
      (a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime()
    );

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("API: Error fetching sensor readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch sensor readings" },
      { status: 500 }
    );
  }
}
