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

function validateSensorData(sensor: any): sensor is HumidityData {
  return (
    sensor &&
    typeof sensor === "object" &&
    typeof sensor.id === "string" &&
    (typeof sensor.humidity === "number" || typeof sensor.humidity === "string") &&
    (typeof sensor.temperature === "number" || typeof sensor.temperature === "string" || sensor.temperature === undefined) &&
    typeof sensor.timestamp === "number"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Received humidity data:", body);

    if (!body || typeof body !== "object" || !("sensors" in body)) {
      console.error("Invalid payload structure:", body);
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    const sensors: HumidityMap = body.sensors;

    if (!sensors || Object.keys(sensors).length === 0) {
      console.error("Empty humidity list");
      return NextResponse.json({ error: "Empty humidity list" }, { status: 400 });
    }

    // Валидация данных каждого сенсора
    const validSensors = _.pickBy(sensors, (sensor, id) => {
      if (!validateSensorData(sensor)) {
        console.error(`Invalid sensor data for ${id}:`, sensor);
        return false;
      }
      return true;
    });

    if (Object.keys(validSensors).length === 0) {
      console.error("No valid sensors found");
      return NextResponse.json({ error: "No valid sensors found" }, { status: 400 });
    }

    // Обновляем кэш только валидными данными
    humidityCache = {
      sensors: validSensors,
      lastUpdate: Date.now(),
    };

    console.log("Updated humidity cache:", humidityCache);
    return NextResponse.json({ 
      status: "ok", 
      received: Object.keys(validSensors).length,
      timestamp: humidityCache.lastUpdate
    });
  } catch (err) {
    console.error("Ошибка при записи данных вологості:", err);
    return NextResponse.json({ 
      error: "Failed to save humidity data",
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const now = Date.now();
    const expired = now - humidityCache.lastUpdate > TIMEOUT_MS;

    // Фильтруем только валидные сенсоры
    const filtered = Object.fromEntries(
      Object.entries(humidityCache.sensors || {})
        .filter(([key, sensor]) => {
          const isValid = key.startsWith("HUM1-") && validateSensorData(sensor);
          if (!isValid) {
            console.warn(`Invalid sensor data for ${key}:`, sensor);
          }
          return isValid;
        })
    );

    console.log("Returning humidity data:", {
      sensorCount: Object.keys(filtered).length,
      expired,
      lastUpdate: new Date(humidityCache.lastUpdate).toISOString()
    });

    return NextResponse.json({
      sensors: expired ? {} : filtered,
      serverTime: now,
      lastUpdate: humidityCache.lastUpdate
    });
  } catch (err) {
    console.error("Error fetching humidity data:", err);
    return NextResponse.json({ 
      error: "Failed to fetch humidity data",
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}
