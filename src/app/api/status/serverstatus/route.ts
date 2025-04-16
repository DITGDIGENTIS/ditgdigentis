import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.resolve("/home/ditg-as/server_status.json");

type ServerStatus = {
  timestamp: number;
};

// GET — проверка статуса сервера
export async function GET() {
  try {
    const rawData = await fs.promises.readFile(filePath, "utf-8");
    const data: ServerStatus = JSON.parse(rawData);

    const now = Date.now();
    const lastUpdate = data.timestamp || 0;
    const online = now - lastUpdate < 20000;

    return NextResponse.json({
      status: online ? "online" : "offline",
      timestamp: lastUpdate,
    });
  } catch (error) {
    console.error("Ошибка при проверке статуса сервера:", error);
    return NextResponse.json(
      { error: "Не удалось получить статус сервера" },
      { status: 500 }
    );
  }
}

// POST — обновление метки времени
export async function POST(req: Request) {
  try {
    const { timestamp } = await req.json();

    if (!timestamp) {
      return NextResponse.json(
        { error: "Missing required field 'timestamp'" },
        { status: 400 }
      );
    }

    await fs.promises.writeFile(
      filePath,
      JSON.stringify({ timestamp }, null, 2),
      "utf-8"
    );

    return NextResponse.json({ status: "Статус сервера обновлен", timestamp });
  } catch (error) {
    console.error("Ошибка при обновлении статуса сервера:", error);
    return NextResponse.json(
      { error: "Не удалось обновить статус сервера" },
      { status: 500 }
    );
  }
}
