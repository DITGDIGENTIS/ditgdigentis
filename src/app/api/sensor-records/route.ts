// ✅ FILE: src/app/api/sensor-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSensorService } from "@/services/sensor.service";
import {
  createSensorData,
  validateBatch,
  validateSensorData,
  SensorDataBatch,
} from "@/services/sensor-data.service";

interface ApiError {
  name?: string;
  message: string;
  stack?: string;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.clone().text();
    const body = JSON.parse(rawBody) as SensorDataBatch;

    if (!body || typeof body !== "object") throw new Error("Invalid request body");
    if (!Array.isArray(body.sensors)) throw new Error("sensors must be an array");
    if (body.sensors.length === 0) throw new Error("sensors array is empty");

    body.sensors.forEach((sensor, index) => {
      if (!validateSensorData(sensor)) {
        throw new Error(`Invalid sensor data at index ${index}: ${JSON.stringify(sensor)}`);
      }
    });

    if (!validateBatch(body)) {
      throw new Error("Invalid batch data format");
    }

    const processedData = createSensorData(body);
    console.log("✅ Saving sensors:", processedData.map(s => s.sensor_id).join(", "));

    const sensorService = createSensorService();
    await sensorService.createRecords(processedData);

    return NextResponse.json({ success: true, processed: processedData.length });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error("POST /api/sensor-records error:", apiError);
    return NextResponse.json(
      { error: "Failed to process sensor data", details: apiError?.message || "Unknown" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sensorService = createSensorService();
    const readings = await sensorService.getAllReadings();

    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;

    const recent = readings.filter(r => {
      const ts = new Date(r.timestamp).getTime();
      return !isNaN(ts) && ts >= fiveMinAgo;
    });

    console.log(`📡 GET /api/sensor-records: ${recent.length} fresh records returned`);

    return NextResponse.json({ readings: recent });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error("GET /api/sensor-records error:", apiError);
    return NextResponse.json(
      { error: "Failed to get readings", details: apiError?.message || "Unknown" },
      { status: 500 }
    );
  }
}
