export const runtime = "nodejs"; // обязательно в начале

import { NextResponse } from "next/server";

// 👀 Определение типа должно быть ДО использования
type RelayCommand = {
  relay: string;
  action: number;
  timestamp: number;
};

// 💾 Переменная для хранения команд
let lastCommand: Record<string, RelayCommand> = {};

// ✅ POST — принять команду
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, relay, action } = body;

    if (!id || !relay || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    lastCommand[id] = {
      relay,
      action,
      timestamp: Date.now(),
    };

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ GET — отдать последнюю команду
export async function GET() {
  return NextResponse.json(lastCommand);
}
