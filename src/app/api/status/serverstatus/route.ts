import { NextRequest, NextResponse } from "next/server";

let lastTimestamp = 0;

export async function POST(req: NextRequest) {
  try {
    const { timestamp } = await req.json();

    if (!timestamp) {
      return NextResponse.json(
        { error: "Missing required field 'timestamp'" },
        { status: 400 }
      );
    }

    lastTimestamp = timestamp;

    return NextResponse.json({ status: "ok", timestamp });
  } catch (error) {
    console.error("Ошибка при POST:", error);
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
    console.error("Ошибка при GET:", error);
    return NextResponse.json({ error: "Ошибка получения статуса" }, { status: 500 });
  }
}
