// src/app/api/relay/route.ts
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

// GET /api/relay?id=zona1
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "No id provided" }, { status: 400 });
  }
  const all = await loadCommands();
  if (!all[id]) {
    return NextResponse.json({ relay: null, action: null, timestamp: 0 });
  }
  return NextResponse.json(all[id]);
}

// POST /api/relay
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
    all[id] = { relay, action, timestamp: Date.now() };
    await saveCommands(all);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/relay error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/relay?id=zona1
// Pi отправляет { relay: null, action: null } чтобы «очистить» команду
export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "No id provided" }, { status: 400 });
    }

    const payload = await req.json(); // { relay: null, action: null, timestamp: ... }

    const all = await loadCommands();
    if (!all[id]) {
      all[id] = { relay: null, action: null, timestamp: 0 };
    }

    all[id] = {
      relay: payload.relay,
      action: payload.action,
      timestamp: payload.timestamp || Date.now(),
    };

    await saveCommands(all);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/relay error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
