import { writeFile, readFile, access } from "fs/promises";
import { constants } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const filePath = path.resolve("/tmp/sensor_humidity.json");

type HumidityMap = {
  [key: string]: {
    id: string;
    humidity: number | string;
    temperature?: number | string;
    timestamp: number;
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object" || !("sensors" in body)) {
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    const sensors: HumidityMap = body.sensors;

    if (!sensors || Object.keys(sensors).length === 0) {
      return NextResponse.json({ error: "Empty humidity list" }, { status: 400 });
    }

    await writeFile(filePath, JSON.stringify(sensors, null, 2), "utf8");
    return NextResponse.json({ status: "ok", received: Object.keys(sensors).length });
  } catch (err) {
    console.error("Ошибка при записи данных вологості:", err);
    return NextResponse.json({ error: "Failed to save humidity data" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await access(filePath, constants.F_OK);
    const raw = await readFile(filePath, "utf8");
    const data: HumidityMap = JSON.parse(raw);

    const filtered = Object.fromEntries(
      Object.entries(data).filter(([key]) => key.startsWith("HUM1-"))
    );

    return NextResponse.json({
      sensors: filtered,
      serverTime: Date.now(),
    });
  } catch {
    return NextResponse.json({
      sensors: {},
      serverTime: Date.now(),
    });
  }
}
