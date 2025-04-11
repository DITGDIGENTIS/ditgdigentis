// app/api/status/route.ts
import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const filePath = path.resolve("/tmp/status.json");

type DeviceStatus = {
  ip: string;
  timestamp: number;
  temp?: string; // Температура датчика (опционально)
};

type StatusMap = {
  [key: string]: DeviceStatus;
};

export async function POST(req: Request) {
  const form = await req.formData();
  const id = form.get("id")?.toString() || "unknown"; // ID, например zona1
  const ip = form.get("ip")?.toString() || "none";  // IP адрес устройства
  const tempRaw = form.get("temp")?.toString(); // Температура в строковом формате
  const temp = tempRaw && tempRaw !== "undefined" ? tempRaw : undefined;  // Если температура есть, то сохраняем
  const timestamp = Date.now(); // Время отправки данных

  let data: StatusMap = {};
  try {
    const raw = await readFile(filePath, "utf8");  // Чтение данных из файла
    data = JSON.parse(raw);  // Парсинг данных
  } catch {
    data = {};  // Если файл пустой, начинаем с пустого объекта
  }

  // Записываем новые данные
  data[id] = {
    ip,
    timestamp,
    ...(temp ? { temp } : {}), // Если температура есть, сохраняем её
  };

  await writeFile(filePath, JSON.stringify(data), "utf8"); // Записываем в файл

  return NextResponse.json({
    status: "ok",
    savedAs: id,
    ip,
    temp, // Включаем температуру в ответ для дебага
  });
}

export async function GET() {
  try {
    const raw = await readFile(filePath, "utf8");  // Чтение данных из файла
    const json = JSON.parse(raw);  // Парсинг данных
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({});
  }
}
