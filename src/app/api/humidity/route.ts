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
    console.log("[API] POST /api/humidity: Начало обработки запроса");

    const body = await req.json();
    console.log("[API] Получены данные:", {
      body,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString(),
    });

    const sensors: HumidityMap = body.sensors || {};

    if (_.isEmpty(sensors)) {
      console.log("[API] Получен пустой объект sensors");
      return NextResponse.json({ status: "ok", received: 0 });
    }

    for (const [sensorId, data] of Object.entries(sensors)) {
      const humidity = parseFloat(String(data.humidity));
      const temperature = parseFloat(String(data.temperature || 0));

      if (isNaN(humidity) || isNaN(temperature)) {
        console.error("[API] Некорректные данные датчика:", {
          sensorId,
          rawData: data,
        });
        return NextResponse.json(
          { error: "Invalid sensor data" },
          { status: 400 }
        );
      }
    }

    humidityCache = {
      sensors,
      lastUpdate: Date.now(),
    };

    console.log("[API] Кэш обновлен:", {
      sensors: Object.entries(sensors).map(([id, data]) => ({
        id,
        humidity: data.humidity,
        temperature: data.temperature,
        timestamp: new Date(data.timestamp).toISOString(),
      })),
      lastUpdate: new Date(humidityCache.lastUpdate).toISOString(),
    });

    return NextResponse.json({
      status: "ok",
      received: Object.keys(sensors).length,
    });
  } catch (err) {
    console.error("[API] Ошибка обработки запроса:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("[API] GET /api/humidity: Запрос данных");

    const now = Date.now();
    const expired = now - humidityCache.lastUpdate > TIMEOUT_MS;

    const filtered = Object.fromEntries(
      Object.entries(humidityCache.sensors || {}).filter(([key]) =>
        key.startsWith("HUM1-")
      )
    );

    // Нормализуем данные перед отправкой
    const normalized = Object.fromEntries(
      Object.entries(filtered).map(([key, data]) => [
        key,
        {
          id: data.id,
          humidity: parseFloat(String(data.humidity)),
          temperature: parseFloat(String(data.temperature || 0)),
          timestamp: data.timestamp,
        },
      ])
    );

    console.log("[API] Отправка данных:", {
      expired,
      sensors: expired ? {} : normalized,
      cacheAge: (now - humidityCache.lastUpdate) / 1000,
      timestamp: new Date(now).toISOString(),
    });

    return NextResponse.json({
      sensors: expired ? {} : normalized,
      serverTime: now,
    });
  } catch (err) {
    console.error("[API] Ошибка получения данных:", err);
    return NextResponse.json({ sensors: {} }, { status: 200 });
  }
}
