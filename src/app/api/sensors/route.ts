// ✅ Стабільний route.ts для POST /api/sensors та GET кешованих (з фіксацією кожні 5 хв)

import { NextRequest, NextResponse } from "next/server";
import { createSensorService } from "@/services/sensor.service";
import {
  SensorDataBatch,
  SensorDataPoint,
  createSensorData,
  validateBatch,
} from "@/services/sensor-data.service";

interface IncomingSensorData {
  id: string;
  temperature: number;
  humidity: number;
  timestamp: number;
}

interface IncomingPayload {
  sensors: Record<string, IncomingSensorData>;
}

const CACHE_TIMEOUT = 10 * 60 * 1000;

let sensorCache: {
  sensors: Record<string, IncomingSensorData>;
  lastUpdate: number;
} = {
  sensors: {},
  lastUpdate: 0,
};

const roundToNearest5Min = (timestamp: number): Date => {
  const ms = 1000 * 60 * 5;
  return new Date(Math.round(timestamp / ms) * ms);
};

export async function POST(req: NextRequest) {
  try {
    const body: IncomingPayload = await req.json();
    if (!body?.sensors || Object.keys(body.sensors).length === 0) {
      return NextResponse.json({ error: "Invalid or empty payload" }, { status: 400 });
    }

    sensorCache = {
      sensors: body.sensors,
      lastUpdate: Date.now(),
    };

    const batch: SensorDataBatch = {
      sensors: Object.values(body.sensors).map((s) => ({
        sensor_id: s.id,
        temperature: s.temperature,
        humidity: s.humidity,
        timestamp: roundToNearest5Min(s.timestamp),
      })),
    };

    if (!validateBatch(batch)) {
      return NextResponse.json({ error: "Invalid sensor data" }, { status: 422 });
    }

    const parsed: SensorDataPoint[] = createSensorData(batch);
    const service = createSensorService();
    await service.createRecords(parsed);

    return NextResponse.json({ success: true, saved: parsed.length });
  } catch (err) {
    console.error("POST /api/sensors error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const now = Date.now();
  const expired = now - sensorCache.lastUpdate > CACHE_TIMEOUT;
  const filtered = Object.fromEntries(
    Object.entries(sensorCache.sensors).filter(([key]) => key.startsWith("SENSOR1-"))
  );
  return NextResponse.json({ sensors: expired ? {} : filtered, serverTime: now });
}
