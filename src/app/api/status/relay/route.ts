// src/app/api/status/relay/route.ts

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface CommandState {
  relay: string | null;
  action: number | null;
  timestamp: number;
}
type CommandsAllZones = Record<string, CommandState>;

const filePath = path.join("/tmp", "relay_commands.json");

/** Загружаем */
async function loadCommands(): Promise<CommandsAllZones> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as CommandsAllZones;
  } catch {
    return {};
  }
}
/** Сохраняем */
async function saveCommands(cmds: CommandsAllZones) {
  await fs.writeFile(filePath, JSON.stringify(cmds, null, 2), "utf-8");
}

/** GET /api/status/relay?id=zona1 => {relay, action, timestamp} */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ relay: null, action: null, timestamp: 0 });
    }
    const all = await loadCommands();
    if (!all[id]) {
      return NextResponse.json({ relay: null, action: null, timestamp: 0 });
    }
    return NextResponse.json(all[id]);
  } catch (err) {
    console.error("GET /api/status/relay error:", err);
    return NextResponse.json({ error: "Could not load command" }, { status: 500 });
  }
}

/** POST /api/status/relay => сохранить команду (id, relay, action) */
export async function POST(req: Request) {
  try {
    const { id, relay, action } = await req.json();
    if (!id || typeof relay !== "string" || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const all = await loadCommands();
    if (!all[id]) {
      all[id] = { relay: null, action: null, timestamp: 0 };
    }

    all[id] = {
      relay,
      action,
      timestamp: Date.now(),
    };
    await saveCommands(all);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/status/relay error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PUT /api/status/relay?id=zona1 => очистить команду
 *  body: { relay: null, action: null, timestamp: ... }
 */
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "No id provided" }, { status: 400 });
    }

    const payload = await req.json(); // { relay: null, action: null, timestamp: ... }

    const all = await loadCommands();
    if (!all[id]) {
      all[id] = { relay: null, action: null, timestamp: 0 };
    }

    all[id].relay = payload.relay;
    all[id].action = payload.action;
    all[id].timestamp = payload.timestamp || Date.now();

    await saveCommands(all);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/status/relay error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
