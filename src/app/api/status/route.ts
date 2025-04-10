import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

// Путь к файлу, где будут храниться данные
const filePath = path.resolve("/tmp/status.json");

type DeviceStatus = {
  ip: string;
  timestamp: number;
  temp?: string; // Температура датчика (опционально)
};

type StatusMap = {
  [key: string]: DeviceStatus;
};

// Функция обработки POST запроса
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    
    // Извлекаем id, ip и температуру
    const id = form.get("id")?.toString() || "unknown"; // ID устройства, например zona1
    const ip = form.get("ip")?.toString() || "none";  // IP устройства
    const tempRaw = form.get("temp")?.toString(); // Температура в строковом формате
    const temp = tempRaw && tempRaw !== "undefined" ? tempRaw : undefined;  // Если температура есть, сохраняем её
    const timestamp = Date.now(); // Время отправки данных
    
    // Логируем получение данных для дебага
    console.log("Received data:", { id, ip, temp });

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
      ...(temp ? { temp } : {}), // Сохраняем температуру, если она есть
    };

    // Записываем обновленные данные в файл
    await writeFile(filePath, JSON.stringify(data), "utf8");

    // Возвращаем успешный ответ с информацией о сохранённых данных
    return NextResponse.json({
      status: "ok",
      savedAs: id,
      ip,
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
