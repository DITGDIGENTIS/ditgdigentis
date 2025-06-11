// src/app/api/last-sensor-readings/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Чтение переменных окружения
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ❗ Гарантия, что переменные установлены (в dev может быть пусто)
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
  timestamp: string;
}

export async function GET() {
  try {
    const now = Date.now();

    const { data, error } = await supabase
      .from("SensorReading")
      .select("sensor_id, temperature, timestamp")
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("❌ Supabase error:", error.message);
      return NextResponse.json({ error: "Failed to fetch sensor data" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Нет данных в таблице SensorReading");
      return NextResponse.json({ sensors: {}, serverTime: now });
    }

    // ✅ Группируем по sensor_id — только последний показ
    const latest: Record<string, {
      id: string;
      temperature: number;
      timestamp: number;
    }> = {};

    for (const row of data as SensorReading[]) {
      const id = row.sensor_id;
      if (!latest[id]) {
        latest[id] = {
          id,
          temperature: parseFloat(String(row.temperature)),
          timestamp: new Date(row.timestamp).getTime(),
        };
      }
    }

    return NextResponse.json({ sensors: latest, serverTime: now });
  } catch (err: any) {
    console.error("🔥 API /api/last-sensor-readings error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
