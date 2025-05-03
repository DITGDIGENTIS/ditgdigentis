// src/app/api/zones/route.ts
import { NextResponse } from "next/server";

type SensorData = {
  id: string;
  temperature: number | string;
  timestamp: number;
};

type SensorMap = {
  [key: string]: SensorData;
};

// Храним кэш в памяти между вызовами
let sensorZonesCache: { sensors: SensorMap; lastUpdate: number } = {
  sensors: {},
  lastUpdate: 0,
};

const TIMEOUT_MS = 10 * 60 * 1000; // 10 минут

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object" || !("sensors" in body)) {
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    const sensors: SensorMap = body.sensors;

    if (!sensors || Object.keys(sensors).length === 0) {
      return NextResponse.json({ error: "Empty sensor list" }, { status: 400 });
    }

    sensorZonesCache = {
      sensors,
      lastUpdate: Date.now(),
    };

    return NextResponse.json({ status: "ok", received: Object.keys(sensors).length });
  } catch (err) {
    console.error("Ошибка при записи сенсоров:", err);
    return NextResponse.json({ error: "Failed to save sensor data" }, { status: 500 });
  }
}

export async function GET() {
  const now = Date.now();

  // Очистим, если не обновлялось 10 минут
  const expired = now - sensorZonesCache.lastUpdate > TIMEOUT_MS;

  const filteredSensors = Object.fromEntries(
    Object.entries(sensorZonesCache.sensors || {}).filter(([key]) => key.startsWith("SENSOR1-"))
  );

  return NextResponse.json({
    sensors: expired ? {} : filteredSensors,
    serverTime: now,
  });
}
