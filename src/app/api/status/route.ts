import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

// Путь к файлу, где будут храниться данные
const filePath = path.resolve("/tmp/status.json");

type DeviceStatus = {
  ip: string;
  timestamp: number;
  temp?: string; // Температура датчика
  relay1?: number; // Статус реле 1
  relay2?: number; // Статус реле 2
  relay3?: number; // Статус реле 3
};

type StatusMap = {
  [key: string]: DeviceStatus;
};

// Функция обработки POST запроса
export async function POST(req: Request) {
  try {
    const form = await req.json(); // Используем req.json() для получения данных в формате JSON
    
    // Извлекаем id, ip, температуру и статусы реле
    const id = form.id || "unknown"; // ID устройства, например zona1
    const ip = form.ip || "none";  // IP устройства
    const relay1 = form.relay1; // Статус реле 1
    const relay2 = form.relay2; // Статус реле 2
    const relay3 = form.relay3; // Статус реле 3
    const temp = form.temp; // Температура датчика (если есть)
    const timestamp = Date.now(); // Время отправки данных
    
    // Логируем получение данных для дебага
    console.log("Received data:", { id, ip, relay1, relay2, relay3, temp });

    let data: StatusMap = {};
    
    // Попробуем прочитать и распарсить данные из файла
    try {
      const raw = await readFile(filePath, "utf8");
      data = JSON.parse(raw);
    } catch {
      data = {}; // Если файл пустой или не существует, начинаем с пустого объекта
    }

    // Добавляем или обновляем данные для указанного устройства
    data[id] = {
      ip,
      timestamp,
      ...(relay1 !== undefined ? { relay1 } : {}),
      ...(relay2 !== undefined ? { relay2 } : {}),
      ...(relay3 !== undefined ? { relay3 } : {}),
      ...(temp !== undefined ? { temp } : {}), // Сохраняем температуру, если она есть
    };

    // Записываем обновленные данные в файл
    await writeFile(filePath, JSON.stringify(data), "utf8");

    // Возвращаем успешный ответ с информацией о сохранённых данных
    return NextResponse.json({
      status: "ok",
      savedAs: id,
      ip,
      relay1,
      relay2,
      relay3,
      temp, // Включаем температуру в ответ для дебага
    });
  } catch (error) {
    console.error("Error in POST request:", error); // Логируем ошибку
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}

// Функция обработки GET запроса для получения данных
export async function GET() {
  try {
    // Попробуем прочитать и распарсить данные из файла
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw);

    // Логируем возвращаемые данные для дебага
    console.log("Returned data:", json);

    // Возвращаем данные в формате JSON
    return NextResponse.json(json);
  } catch (error) {
    console.error("Error in GET request:", error); // Логируем ошибку
    return NextResponse.json({}, { status: 500 }); // Возвращаем пустой объект в случае ошибки
  }
}
     