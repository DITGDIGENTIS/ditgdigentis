// src/app/api/status/relay/route.ts

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

// Путь до JSON-файла: /tmp - временная директория
const filePath = path.join("/tmp", "relay_state.json");

/**
 * Загружаем текущее состояние всех зон (id).
 * Если файла нет — возвращаем пустой объект.
 */
async function loadStates(): Promise<Record<string, RelayState>> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error: unknown) {
    // Файл не найден или ошибка парсинга - возвращаем пустое хранилище
    console.error("Ошибка чтения файла состояния:", error);
    return {};
  }
}

/**
 * Сохраняем состояние всех зон в JSON-файл
 */
async function saveStates(states: Record<string, RelayState>): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(states, null, 2), "utf-8");
}

/**
 * POST-запрос
 * Обновляем состояние определённого реле (relay1, relay2, relay3)
 * у конкретной зоны (id).
 */
export async function POST(req: Request) {
  try {
    const { id, relay, action } = await req.json();

    // Валидация
    if (!id || typeof relay !== "string" || typeof action !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const states = await loadStates();

    // Если зоны ещё нет, создаём её
    if (!states[id]) {
      states[id] = {
        relay1: 0,
        relay2: 0,
        relay3: 0,
        timestamp: 0,
      };
    }

    // Проверяем, правильное ли название реле
    if (!["relay1", "relay2", "relay3"].includes(relay)) {
      return NextResponse.json({ error: "Invalid relay name" }, { status: 400 });
    }

    // Обновляем состояние
    states[id][relay as keyof RelayState] = action;
    states[id].timestamp = Date.now();

    // Сохраняем в /tmp/relay_state.json
    await saveStates(states);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("POST /api/status/relay error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * GET-запрос
 * Возвращаем текущее состояние всех зон (id).
 */
export async function GET() {
  try {
    const states = await loadStates();
    return NextResponse.json(states);
  } catch (error: unknown) {
    console.error("GET /api/status/relay error:", error);
    return NextResponse.json({ error: "Could not load state" }, { status: 500 });
  }
}
