// src/app/api/status/server/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Указываем путь к файлу для хранения данных о статусе сервера
const filePath = path.resolve("/home/ditg-z1/server_status.json");

type ServerStatus = {
  timestamp: number;
};

// Функция для обработки GET запроса
export async function GET() {
  try {
    // Чтение данных из файла с использованием асинхронных операций
    const rawData = await fs.promises.readFile(filePath, "utf-8");
    const data: ServerStatus = JSON.parse(rawData);

    // Получаем текущее время
    const now = Date.now();

    // Проверяем, если последнее обновление сервера было в последние 20 секунд
    const lastUpdate = data.timestamp || 0;
    const online = now - lastUpdate < 20000;

    // Возвращаем статус сервера (online или offline)
    return NextResponse.json({ status: online ? "online" : "offline" });
  } catch (error) {
    console.error("Ошибка при проверке статуса сервера:", error);
    return NextResponse.json({ error: "Не удалось получить статус сервера" }, { status: 500 });
  }
}

// Функция для обработки POST запроса
export async function POST(req: Request) {
  try {
    // Извлекаем тело запроса как JSON
    const { timestamp } = await req.json();

    // Проверка на наличие обязательного поля 'timestamp'
    if (!timestamp) {
      return NextResponse.json({ error: "Missing required field 'timestamp'" }, { status: 400 });
    }

    // Записываем временную метку в файл
    await fs.promises.writeFile(filePath, JSON.stringify({ timestamp }, null, 2), "utf-8");

    // Возвращаем успешный ответ
    return NextResponse.json({ status: "Статус сервера обновлен", timestamp });
  } catch (error) {
    console.error("Ошибка при обновлении статуса сервера:", error);
    return NextResponse.json({ error: "Не удалось обновить статус сервера" }, { status: 500 });
  }
}
