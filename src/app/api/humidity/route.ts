// src/app/api/humidity/route.ts
import { NextResponse } from "next/server";

type HumidityData = {
  id: string;
  humidity: number | string;
  temperature?: number | string;
  timestamp: number;
};

type HumidityMap = {
  [key: string]: HumidityData;
};

let humidityCache: { sensors: HumidityMap; lastUpdate: number } = {
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

    const sensors: HumidityMap = body.sensors;

    if (!sensors || Object.keys(sensors).length === 0) {
      return NextResponse.json({ error: "Empty humidity list" }, { status: 400 });
    }

    humidityCache = {
      sensors,
      lastUpdate: Date.now(),
    };

    return NextResponse.json({ status: "ok", received: Object.keys(sensors).length });
  } catch (err) {
    console.error("Ошибка при записи данных вологості:", err);
    return NextResponse.json({ error: "Failed to save humidity data" }, { status: 500 });
  }
}

export async function GET() {
  const now = Date.now();
  const expired = now - humidityCache.lastUpdate > TIMEOUT_MS;

  const filtered = Object.fromEntries(
    Object.entries(humidityCache.sensors || {}).filter(([key]) => key.startsWith("HUM1-"))
  );

  return NextResponse.json({
    sensors: expired ? {} : filtered,
    serverTime: now,
  });
}
