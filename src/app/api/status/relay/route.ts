import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * В файле /tmp/relay_commands.json храним:
 * {
 *   "zona1": {
 *     relay: "relay2",
 *     action: 1,
 *     timestamp: 1681500000000,
 *     relayState: { relay1:0, relay2:1, relay3:0 }
 *   },
 *   ...
 * }
 */
interface CommandState {
  relay: string | null;
  action: number | null;
  timestamp: number;
  relayState?: Record<string, number>;
}

type CommandsAllZones = Record<string, CommandState>;

const filePath = path.join("/tmp", "relay_commands.json");

async function loadCommands(): Promise<CommandsAllZones> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as CommandsAllZones;
  } catch {
    return {};
  }
}

async function saveCommands(cmds: CommandsAllZones) {
  await fs.writeFile(filePath, JSON.stringify(cmds, null, 2), "utf-8");
}

/** GET /api/status/relay?id=zona1 => { relay, action, timestamp, relayState } */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({
        relay: null,
        action: null,
        timestamp: 0,
        relayState: {},
      });
    }

    const store = await loadCommands();
    const state = store[id];
    if (!state) {
      // Если нет записей - вернём пустую структуру
      return NextResponse.json({
        relay: null,
        action: null,
        timestamp: 0,
        relayState: {},
      });
    }

    return NextResponse.json(state);
  } catch (err) {
    console.error("GET /api/status/relay error:", err);
    return NextResponse.json({ error: "Could not load command" }, { status: 500 });
  }
}

/**
 * POST /api/status/relay => сайт отправляет { id, relay, action }
 * Pi прочитает (GET) и применит. 
 */
export async function POST(req: Request) {
  try {
    const { id, relay, action } = await req.json();
    if (!id || typeof relay !== "string" || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const store = await loadCommands();
    if (!store[id]) {
      store[id] = {
        relay: null,
        action: null,
        timestamp: 0,
        relayState: {},
      };
    }
    store[id].relay = relay;
    store[id].action = action;
    store[id].timestamp = Date.now();

    await saveCommands(store);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/status/relay error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/status/relay?id=zona1 => Pi отправляет { relayState: {...} }
 * Мы сохраняем реальное состояние, чтобы сайт при GET видел { relayState: {...} }
 */
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "No id provided" }, { status: 400 });
    }

    const payload = await req.json(); // { relay: null, action: null, timestamp, relayState:{...} }
    const store = await loadCommands();
    if (!store[id]) {
      store[id] = {
        relay: null,
        action: null,
        timestamp: 0,
        relayState: {},
      };
    }

    // Запишем ключи, если переданы
    store[id].relay = payload.relay;
    store[id].action = payload.action;
    store[id].timestamp = payload.timestamp || Date.now();

    if (payload.relayState) {
      store[id].relayState = payload.relayState;
    }

    await saveCommands(store);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/status/relay error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
