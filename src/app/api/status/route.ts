import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

// Путь к файлу, где будут храниться данные
const filePath = path.resolve("/tmp/status.json");

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
    const form = await req.json();  // Используем json() вместо formData()

    // Извлекаем id, ip и температуру
    const { id, ip, relay1, relay2, relay3, temp } = form;

    // Логируем получение данных для дебага
    console.log("Received data:", { id, ip, relay1, relay2, relay3, temp });

    let data: StatusMap = {};
    
    // Попробуем прочитать и распарсить данные из файла
    try {
      const raw = await readFile(filePath, "utf8");
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Error reading or parsing file:", err);
      data = {};  // Если файл пустой или не существует, начинаем с пустого объекта
    }

    // Добавляем или обновляем данные для указанного устройства
    data[id] = {
      ip,
      timestamp: Date.now(),
      relay1,
      relay2,
      relay3,
      temp,
    };

    // Записываем обновленные данные в файл
    try {
      await writeFile(filePath, JSON.stringify(data), "utf8");
    } catch (err) {
      console.error("Error writing to file:", err);
      return NextResponse.json({ status: "error", message: "File write error" }, { status: 500 });
    }

    return NextResponse.json({
      status: "ok",
      savedAs: id,
      ip,
      relay1,
      relay2,
      relay3,
      temp,
    });
  } catch (error) {
    console.error("Error in POST request:", error);  // Логируем ошибку
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

    return NextResponse.json(json);
  } catch (error) {
    console.error("Error in GET request:", error);  // Логируем ошибку
    return NextResponse.json({}, { status: 500 });  // Возвращаем пустой объект в случае ошибки
  }
}
