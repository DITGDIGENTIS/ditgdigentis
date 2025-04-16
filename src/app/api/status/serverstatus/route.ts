import { NextRequest, NextResponse } from "next/server";

const SOURCE_URL = "http://192.168.100.2:8787"; // ← Укажи IP твоего ditg-as сервера

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, { cache: "no-store" });

    if (!res.ok) {
      throw new Error("Remote server not reachable");
    }

    const { timestamp } = await res.json();

    const now = Date.now();
    const online = now - timestamp < 20000;

    return NextResponse.json({
      status: online ? "online" : "offline",
      timestamp,
    });
  } catch (error) {
    console.error("Ошибка GET:", error);
    return NextResponse.json({ error: "Ошибка получения статуса" }, { status: 500 });
  }
}

// POST оставлен, если вручную хочешь слать данные
export async function POST(req: NextRequest) {
  try {
    const { timestamp } = await req.json();

    if (!timestamp || typeof timestamp !== "number") {
      return NextResponse.json({ error: "Missing or invalid 'timestamp'" }, { status: 400 });
    }

    // просто логируем (но не сохраняем в памяти, потому что это бесполезно)
    console.log("Получен timestamp:", timestamp);

    return NextResponse.json({ status: "ok", timestamp });
  } catch (error) {
    console.error("Ошибка POST:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
