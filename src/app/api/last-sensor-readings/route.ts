import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Проверка окружения
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ Supabase credentials are missing in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  try {
    const now = Date.now();

    const { data, error } = await supabase
      .from("SensorReading")
      .select("sensor_id, temperature, timestamp")
      .order("timestamp", { ascending: false });

    if (error || !data) {
      console.error("❌ Supabase fetch error:", error?.message);
      return NextResponse.json({ error: "Failed to fetch sensor data" }, { status: 500 });
    }

    // ⏱ Группировка: сохраняем только последнее показание для каждого sensor_id
    const latest: Record<string, {
      id: string;
      temperature: number;
      timestamp: number;
    }> = {};

    for (const row of data) {
      const id = row.sensor_id;
      if (!latest[id]) {
        latest[id] = {
          id,
          temperature: parseFloat(row.temperature),
          timestamp: new Date(row.timestamp).getTime(),
        };
      }
    }

    return NextResponse.json({
      sensors: latest,
      serverTime: now,
    });
  } catch (err) {
    console.error("🔥 API /api/last-sensor-readings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
