import { NextResponse } from "next/server";

type RelayState = {
  relay1: number;
  relay2: number;
  relay3: number;
  timestamp: number;
};

interface GlobalRelayStorage extends Record<string, unknown> {
  relayStates?: Record<string, RelayState>;
}

// ✅ Используем globalThis для хранения в runtime
const globalScope: GlobalRelayStorage = globalThis as GlobalRelayStorage;
if (!globalScope.relayStates) globalScope.relayStates = {};
const relayStates = globalScope.relayStates;

// ✅ POST — сохранить команду управления реле
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, relay, action } = body;

    // ❗ Проверка на валидные данные
    if (!id || !relay || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ✅ Инициализация зоны, если её ещё нет
    if (!relayStates[id]) {
      relayStates[id] = {
        relay1: 0,
        relay2: 0,
        relay3: 0,
        timestamp: 0,
      };
    }

    // ✅ Обновляем состояние реле
    if (["relay1", "relay2", "relay3"].includes(relay)) {
      relayStates[id][relay as keyof RelayState] = action;
      relayStates[id].timestamp = Date.now();
    } else {
      return NextResponse.json({ error: "Invalid relay name" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("POST /api/status/relay error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ GET — отдать все статусы реле
export async function GET() {
  return NextResponse.json(relayStates);
}
