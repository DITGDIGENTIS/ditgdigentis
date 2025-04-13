export const runtime = "nodejs";

import { NextResponse } from "next/server";

// 👀 Определение типа должно быть ДО использования
type RelayCommand = {
  relay: string;
  action: number;
  timestamp: number;
};

// 💾 Переменная для хранения команд (в globalThis для надёжности в dev/edge)
const globalScope = globalThis as any;
if (!globalScope.lastCommand) globalScope.lastCommand = {};
const lastCommand: Record<string, RelayCommand> = globalScope.lastCommand;

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
