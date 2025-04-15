// src/app/api/status/relay/route.ts

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ relay: null, action: null, timestamp: 0, relayState: {} });
    }

    const all = await loadCommands();
    if (!all[id]) {
      return NextResponse.json({ relay: null, action: null, timestamp: 0, relayState: {} });
    }

    return NextResponse.json({
      relay: all[id].relay ?? null,
      action: all[id].action ?? null,
      timestamp: all[id].timestamp ?? 0,
      relayState: all[id].relayState ?? {},
    });
  } catch (err) {
    console.error("GET /api/status/relay error:", err);
    return NextResponse.json({ error: "Could not load command" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { id, relay, action } = await req.json();
    if (!id || typeof relay !== "string" || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const all = await loadCommands();
    if (!all[id]) {
      all[id] = { relay: null, action: null, timestamp: 0, relayState: {} };
    }

    all[id].relay = relay;
    all[id].action = action;
    all[id].timestamp = Date.now();

    await saveCommands(all);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/status/relay error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "No id provided" }, { status: 400 });
    }

    const payload = await req.json();
    const all = await loadCommands();

    if (!all[id]) {
      all[id] = { relay: null, action: null, timestamp: 0, relayState: {} };
    }

    all[id].relay = null;
    all[id].action = null;
    all[id].timestamp = payload.timestamp || Date.now();

    if (payload.relayState && typeof payload.relayState === "object") {
      all[id].relayState = payload.relayState;
    }

    await saveCommands(all);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/status/relay error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
