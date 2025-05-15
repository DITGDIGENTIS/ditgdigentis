// src/app/api/humidity/route.ts
import { NextResponse } from "next/server";
import _ from "lodash";

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
    const sensors: HumidityMap = body.sensors || {};

    if (_.isEmpty(sensors)) {
      return NextResponse.json({ status: "ok", received: 0 });
    }

    // Обновляем кэш
    humidityCache = {
      sensors,
      lastUpdate: Date.now(),
    };

    return NextResponse.json({ 
      status: "ok", 
      received: Object.keys(sensors).length
    });
  } catch (err) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const now = Date.now();
    const expired = now - humidityCache.lastUpdate > TIMEOUT_MS;

    // Фильтруем только сенсоры HUM1-
    const filtered = Object.fromEntries(
      Object.entries(humidityCache.sensors || {})
        .filter(([key]) => key.startsWith("HUM1-"))
    );

    return NextResponse.json({
      sensors: expired ? {} : filtered,
      serverTime: now
    });
  } catch (err) {
    return NextResponse.json({ sensors: {} }, { status: 200 });
  }
}
