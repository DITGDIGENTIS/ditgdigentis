// src/app/api/last-sensor-readings/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase credentials are missing");
  throw new Error("❌ Supabase credentials missing.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SensorReading {
  sensor_id: string;
  temperature: number | string;
  timestamp: string | null;
}

export async function GET() {
  const now = Date.now();

  try {
    // ⬇️ Отримуємо останні 1000 записів — оптимальний буфер
    const { data, error } = await supabase
      .from("SensorReading")
      .select("sensor_id, temperature, timestamp")
      .order("timestamp", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("❌ Supabase fetch error:", error.message, error.details || "");
      return NextResponse.json({ error: "Failed to fetch sensor data" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Нет данных в таблице SensorReading");
      return NextResponse.json({ sensors: {}, serverTime: now });
    }

    // 🔄 Повертаємо лише останній запис на кожен sensor_id
    const latest: Record<string, { id: string; temperature: number; timestamp: number }> = {};
    const seen = new Set<string>();

    for (const row of data as SensorReading[]) {
      const { sensor_id, temperature, timestamp } = row;

      if (!sensor_id || !timestamp || seen.has(sensor_id)) continue;

      const ts = Date.parse(timestamp);
      if (isNaN(ts)) continue;

      latest[sensor_id] = {
        id: sensor_id,
        temperature: typeof temperature === "number" ? temperature : parseFloat(temperature),
        timestamp: ts,
      };

      seen.add(sensor_id);
    }

    console.log("✅ Отправлены последние показания:", latest);

    return NextResponse.json({
      sensors: latest,
      serverTime: now,
    });
  } catch (err: any) {
    console.error("🔥 API /api/last-sensor-readings error:", err?.message || err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
