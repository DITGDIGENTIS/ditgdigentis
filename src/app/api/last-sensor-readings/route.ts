// src/app/api/last-sensor-readings/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Чтение переменных окружения
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are missing in .env or project settings");
  throw new Error("❌ Supabase credentials missing.");
}

// ✅ Создание клиента Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ✅ Типизация строки из таблицы
interface SensorReading {
  sensor_id: string;
  temperature: number | string;
  timestamp: string | null;
}

export async function GET() {
  try {
    const now = Date.now();

    // ✅ Получение данных
    const { data, error } = await supabase
      .from("SensorReading")
      .select("sensor_id, temperature, timestamp")
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("❌ Supabase fetch error:", error.message, error.details || "");
      return NextResponse.json({ error: "Failed to fetch sensor data" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Нет данных в таблице SensorReading");
      return NextResponse.json({ sensors: {}, serverTime: now });
    }

    const latest: Record<
      string,
      {
        id: string;
        temperature: number;
        timestamp: number;
      }
    > = {};

    for (const row of data as SensorReading[]) {
      const { sensor_id, temperature, timestamp } = row;

      if (!sensor_id || !timestamp) {
        console.warn(`⛔ Пропущен: ${sensor_id} из-за отсутствия timestamp`);
        continue;
      }

      const ts = new Date(timestamp).getTime();
      if (isNaN(ts)) {
        console.warn(`⛔ Пропущен: ${sensor_id} из-за некорректного timestamp = ${timestamp}`);
        continue;
      }

      if (!latest[sensor_id]) {
        latest[sensor_id] = {
          id: sensor_id,
          temperature: parseFloat(String(temperature)),
          timestamp: ts,
        };
      }
    }

    console.log("✅ Отправлены последние данные:", latest);

    return NextResponse.json({
      sensors: latest,
      serverTime: now,
    });
  } catch (err: any) {
    console.error("🔥 API /api/last-sensor-readings error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
