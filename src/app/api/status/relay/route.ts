export const runtime = "nodejs";

import { NextResponse } from "next/server";

// 👀 Определение типа должно быть ДО использования
type RelayCommand = {
  relay: string;
  action: number;
  timestamp: number;
};

// 💾 Переменная для хранения команд (в globalThis для надёжности в dev/edge)
interface GlobalWithCommand extends Record<string, unknown> {
  lastCommand?: Record<string, RelayCommand>;
}

const globalScope: GlobalWithCommand = globalThis as GlobalWithCommand;
if (!globalScope.lastCommand) globalScope.lastCommand = {};
const lastCommand = globalScope.lastCommand;

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
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ GET — отдать последнюю команду
export async function GET() {
  return NextResponse.json(lastCommand);
}
