import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, access } from "fs/promises";
import { constants } from "fs";
import path from "path";

const filePath = path.resolve("/tmp/humidity_sensors.json");

type HumidityMap = {
  [key: string]: {
    id: string;
    humidity: number | string;
    timestamp: number;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body: HumidityMap = await req.json();
    await writeFile(filePath, JSON.stringify(body, null, 2), "utf8");

    return NextResponse.json({ status: "ok", received: Object.keys(body).length });
  } catch (err) {
    console.error("Ошибка при записи влажности:", err);
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
