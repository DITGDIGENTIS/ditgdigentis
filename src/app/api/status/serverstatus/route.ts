// src/app/api/status/serverstatus/route.ts
import { NextRequest, NextResponse } from "next/server";

let lastTimestamp: number = 0;

export async function POST(req: NextRequest) {
  try {
    const { timestamp } = await req.json();

    if (!timestamp || typeof timestamp !== "number") {
      return NextResponse.json({ error: "Missing or invalid 'timestamp'" }, { status: 400 });
    }

    lastTimestamp = timestamp;

    return NextResponse.json({ status: "updated", timestamp });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const now = Date.now();
    const online = now - lastTimestamp < 20000;

    return NextResponse.json({
      status: online ? "online" : "offline",
      timestamp: lastTimestamp,
    });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Ошибка получения статуса" }, { status: 500 });
  }
}
