import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Тип состояния реле
interface RelayState {
  relay1: number;
  relay2: number;
  relay3: number;
  timestamp: number;
}

// Путь до JSON-файла (если локально в /tmp, Vercel позволит писать временно)
const filePath = path.resolve("/tmp", "relay_state.json");

async function loadStates(): Promise<Record<string, RelayState>> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {}; // если файл не существует
  }
}

async function saveStates(states: Record<string, RelayState>) {
  await fs.writeFile(filePath, JSON.stringify(states, null, 2), "utf-8");
}

// ✅ POST — обновить состояние реле
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, relay, action } = body;

    if (!id || !relay || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const states = await loadStates();

    if (!states[id]) {
      states[id] = {
        relay1: 0,
        relay2: 0,
        relay3: 0,
        timestamp: 0,
      };
    }

    if (["relay1", "relay2", "relay3"].includes(relay)) {
      states[id][relay as keyof RelayState] = action;
      states[id].timestamp = Date.now();
      await saveStates(states);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid relay name" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("POST /api/status/relay error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ✅ GET — вернуть все текущие состояния
export async function GET() {
  const states = await loadStates();
  return NextResponse.json(states);
}