import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

// Путь к файлу, где будут храниться данные
const filePath = path.resolve("data/status.json"); // Использование постоянного пути

type DeviceStatus = {
  ip: string;
  timestamp: number;
  temp?: string; // Температура датчика (опционально)
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
    const form = await req.formData();

    // Извлекаем id, ip и статусы реле
    const id = form.get("id")?.toString() || "unknown"; // ID устройства, например zona1
    const ip = form.get("ip")?.toString() || "none";  // IP устройства
    const relay1 = form.get("relay1")?.toString(); // Статус реле 1
    const relay2 = form.get("relay2")?.toString(); // Статус реле 2
    const relay3 = form.get("relay3")?.toString(); // Статус реле 3
    const temp = form.get("temp")?.toString(); // Температура датчика (если есть)
    const timestamp = Date.now(); // Время отправки данных

    // Логируем получение данных для дебага
    console.log("Received data:", { id, ip, relay1, relay2, relay3, temp });

    // Проверяем на корректность статуса реле
    const relayStatus = {
      relay1: relay1 ? parseInt(relay1) : undefined,
      relay2: relay2 ? parseInt(relay2) : undefined,
      relay3: relay3 ? parseInt(relay3) : undefined,
    };

    // Попробуем прочитать и распарсить данные из файла
    let data: StatusMap = {};
    try {
      const raw = await readFile(filePath, "utf8");
      data = JSON.parse(raw);
    } catch (error) {
      // Если файл пустой или не существует, начинаем с пустого объекта
      console.error("Error reading file:", error);
      data = {};
    }

    // Добавляем или обновляем данные для указанного устройства
    data[id] = {
      ip,
      timestamp,
      ...(temp ? { temp } : {}),
      ...(relayStatus.relay1 !== undefined ? { relay1: relayStatus.relay1 } : {}),
      ...(relayStatus.relay2 !== undefined ? { relay2: relayStatus.relay2 } : {}),
      ...(relayStatus.relay3 !== undefined ? { relay3: relayStatus.relay3 } : {}),
    };

    // Записываем обновленные данные в файл
    try {
      await writeFile(filePath, JSON.stringify(data), "utf8");
      console.log("Data saved successfully");
    } catch (error) {
      console.error("Error writing file:", error);
    }

    // Возвращаем успешный ответ с информацией о сохранённых данных
    return NextResponse.json({
      status: "ok",
      savedAs: id,
      ip,
      relay1: relayStatus.relay1,
      relay2: relayStatus.relay2,
      relay3: relayStatus.relay3,
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
