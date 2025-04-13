// src/app/api/status/relay/route.ts

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * Храним для каждой зоны { relay, action, timestamp }
 */
interface CommandState {
  relay: string | null;
  action: number | null;
  timestamp: number;
}

/**
 * Общая структура:
 * {
 *   zona1: { relay: "relay2", action: 1, timestamp: 1681234567890 },
 *   zona2: { relay: null, action: null, timestamp: 0 }
 *   ...
 * }
 */
type CommandsAllZones = Record<string, CommandState>;

/**
 * Путь до файла в /tmp (ephemeral storage на Vercel).
 * При холодном старте может быть пуст — но Raspberry Pi хранит состояние локально.
 */
const filePath = path.join("/tmp", "relay_commands.json");

/** Загружаем команды для всех зон (из /tmp) */
async function loadCommands(): Promise<CommandsAllZones> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as CommandsAllZones;
  } catch {
    // Если нет файла или ошибка чтения — пустой объект
    return {};
  }
}

/** Сохраняем команды для всех зон */
async function saveCommands(cmds: CommandsAllZones): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(cmds, null, 2), "utf-8");
}

/**
 * POST: Записываем последнюю команду (relay, action) для zone id
 * Пример: { id: "zona1", relay: "relay2", action: 1 }
 */
export async function POST(req: Request) {
  try {
    const { id, relay, action } = await req.json();

    // Проверяем входящие данные
    if (!id || typeof relay !== "string" || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Загружаем существующий набор команд
    const cmds = await loadCommands();

    // Если zone (id) не существует, создаём её
    if (!cmds[id]) {
      cmds[id] = { relay: null, action: null, timestamp: 0 };
    }

    // Запишем последнюю команду
    cmds[id] = {
      relay,
      action,
      timestamp: Date.now(),
    };

    // Сохраним в /tmp/relay_commands.json
    await saveCommands(cmds);

    // Успешный ответ
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("POST /api/status/relay error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * GET: Возвращает объект { relay, action, timestamp } для ?id=zona1
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "No id provided" }, { status: 400 });
    }

    // Читаем список команд
    const cmds = await loadCommands();
    // Если нет записей для этой zone
    if (!cmds[id]) {
      return NextResponse.json({ relay: null, action: null, timestamp: 0 });
    }

    return NextResponse.json(cmds[id]);
  } catch (error: unknown) {
    console.error("GET /api/status/relay error:", error);
    return NextResponse.json({ error: "Could not load command" }, { status: 500 });
  }
}
