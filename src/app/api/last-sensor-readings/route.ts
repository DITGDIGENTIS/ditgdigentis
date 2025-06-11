import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const now = Date.now();

  const { data, error } = await supabase
    .from("SensorReading")
    .select("sensor_id, temperature, timestamp")
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // Группируем по sensor_id и оставляем только последнее значение
  const latest: Record<string, {
    id: string;
    temperature: number;
    timestamp: number;
  }> = {};

  for (const entry of data) {
    const sid = entry.sensor_id;
    if (!latest[sid]) {
      latest[sid] = {
        id: sid,
        temperature: entry.temperature,
        timestamp: new Date(entry.timestamp).getTime(),
      };
    }
  }

  return NextResponse.json({
    sensors: latest,
    serverTime: now,
  });
}
