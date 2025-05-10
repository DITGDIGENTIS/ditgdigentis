import { NextRequest, NextResponse } from "next/server";
import { createSensorService } from "@/services/sensor.service";
import {
  SensorDataPoint,
  SensorDataBatch,
  createSensorData,
  validateBatch,
} from "@/services/sensor-data.service";

type SensorData = {
  id: string;
  temperature: number;
  humidity: number;
  timestamp: number;
};

type SensorMap = {
  [key: string]: SensorData;
};

let sensorZonesCache: { sensors: SensorMap; lastUpdate: number } = {
  sensors: {},
  lastUpdate: 0,
};

const TIMEOUT_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object" || !("sensors" in body)) {
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    const sensors: SensorMap = body.sensors;

    if (!sensors || Object.keys(sensors).length === 0) {
      return NextResponse.json({ error: "Empty sensor list" }, { status: 400 });
    }

    // 🧠 Обновляем кэш
    sensorZonesCache = {
      sensors,
      lastUpdate: Date.now(),
    };

    // 🔄 Преобразуем в SensorDataPoint[]
    const sensorArray: SensorDataBatch = {
      sensors: Object.values(sensors).map((item) => ({
        sensor_id: item.id,
        temperature: item.temperature,
        humidity: item.humidity,
        timestamp: new Date(item.timestamp),
      })),
    };

    if (!validateBatch(sensorArray)) {
      return NextResponse.json({ error: "Invalid sensor data" }, { status: 422 });
    }

    const parsedData: SensorDataPoint[] = createSensorData(sensorArray);

    const sensorService = createSensorService();
    await sensorService.createRecords(parsedData);

    return NextResponse.json({
      status: "ok",
      saved: parsedData.length,
    });
  } catch (err) {
    console.error("POST /api/zones error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const now = Date.now();

  const expired = now - sensorZonesCache.lastUpdate > TIMEOUT_MS;

  const filteredSensors = Object.fromEntries(
    Object.entries(sensorZonesCache.sensors || {}).filter(([key]) =>
      key.startsWith("SENSOR1-")
    )
  );

  return NextResponse.json({
    sensors: expired ? {} : filteredSensors,
    serverTime: now,
  });
}
