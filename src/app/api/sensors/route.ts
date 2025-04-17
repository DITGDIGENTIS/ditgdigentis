import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, access } from "fs/promises";
import { constants } from "fs";
import path from "path";

const filePath = path.resolve("/tmp/sensor_zones.json");

type SensorMap = {
  [key: string]: {
    id: string;
    temperature: number | string;
    timestamp: number;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body: SensorMap = await req.json();
    await writeFile(filePath, JSON.stringify(body, null, 2), "utf8");

    return NextResponse.json({ status: "ok", received: Object.keys(body).length });
  } catch (err) {
    console.error("Ошибка при записи сенсоров:", err);
    return NextResponse.json({ error: "Failed to save sensor data" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await access(filePath, constants.F_OK);
    const raw = await readFile(filePath, "utf8");
    const data: SensorMap = JSON.parse(raw);

    const filtered = Object.fromEntries(
      Object.entries(data).filter(([key]) => key.startsWith("SENSOR1-"))
    );

    return NextResponse.json({
      sensors: filtered,
      serverTime: Date.now(), // 💥 стабильное серверное время
    });
  } catch {
    return NextResponse.json({
      sensors: {},
      serverTime: Date.now(),
    });
  }
}
