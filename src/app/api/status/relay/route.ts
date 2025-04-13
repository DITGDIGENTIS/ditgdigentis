import { NextResponse } from "next/server";

// Тип состояния реле
type RelayState = {
  relay1: number;
  relay2: number;
  relay3: number;
  timestamp: number;
};

// Интерфейс глобального хранилища
interface GlobalRelayStorage extends Record<string, unknown> {
  relayStates?: Record<string, RelayState>;
}

// Используем глобальное пространство памяти во время работы сервера
const globalScope: GlobalRelayStorage = globalThis as GlobalRelayStorage;
if (!globalScope.relayStates) globalScope.relayStates = {};
const relayStates = globalScope.relayStates;

// ✅ POST — обновить состояние реле
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, relay, action } = body;

    // Валидация входящих данных
    if (!id || !relay || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Инициализация зоны, если не существует
    if (!relayStates[id]) {
      relayStates[id] = {
        relay1: 0,
        relay2: 0,
        relay3: 0,
        timestamp: 0,
      };
    }

    // Проверка и обновление нужного реле
    if (["relay1", "relay2", "relay3"].includes(relay)) {
      relayStates[id][relay as keyof RelayState] = action;
      relayStates[id].timestamp = Date.now();

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid relay name" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Ошибка обработки POST /api/status/relay:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ GET — вернуть все текущие состояния
export async function GET() {
  return NextResponse.json(relayStates);
}
