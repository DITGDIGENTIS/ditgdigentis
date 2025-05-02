import { writeFile, readFile, access } from "fs/promises";
import { constants } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

interface HumiditySensor {
  id: string;
  humidity: number | string;
  temperature?: number | string;
  timestamp: number;
}

interface HumidityData {
  sensors: Record<string, HumiditySensor>;
  serverTime: number;
}

// ⚠️ Шлях, який буде працювати на Vercel
const filePath = path.resolve("/tmp/humidity_sensors.json");

export async function POST(req: NextRequest) {
  try {
    const body: HumidityData = await req.json();
    await writeFile(filePath, JSON.stringify(body, null, 2), "utf8");

    return NextResponse.json({
      status: "ok",
      received: Object.keys(body?.sensors || {}).length,
    });
  } catch (err: unknown) {
    console.error("Помилка запису у файл:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to save humidity data" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await access(filePath, constants.F_OK);
    const raw = await readFile(filePath, "utf8");
    const data: HumidityData = JSON.parse(raw);

    const filteredSensors: Record<string, HumiditySensor> = Object.fromEntries(
      Object.entries(data.sensors || {}).filter(([key]) => key.startsWith("HUM1-"))
    );

    return NextResponse.json({
      sensors: filteredSensors,
      serverTime: Date.now(),
    });
  } catch (err: unknown) {
    console.error("Помилка читання файлу:", err instanceof Error ? err.message : err);
    return NextResponse.json({
      sensors: {},
      serverTime: Date.now(),
    });
  }
}
