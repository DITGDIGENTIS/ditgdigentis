import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Путь к файлу для хранения данных
const filePath = path.resolve("/home/ditg-z1/sensor_zones.json");

// Типизация для структуры данных
type SensorData = {
  timestamp: number;
  ip: string;
  temp: string;
};

// Функция для обработки GET запроса
export async function GET() {
  try {
    // Чтение данных из файла с использованием асинхронных операций
    const rawData = await fs.promises.readFile(filePath, "utf-8");
    const data: Record<string, SensorData> = JSON.parse(rawData);

    // Фильтруем только те записи, которые начинаются с "28-" (датчики температуры)
    const filteredData = Object.keys(data)
      .filter((key) => key.startsWith("28-")) // Фильтруем только датчики
      .reduce((obj: Record<string, SensorData>, key) => {
        obj[key] = data[key]; // Копируем только те записи, которые подходят
        return obj;
      }, {}); // Инициализируем объект как Record<string, SensorData>

    // Возвращаем отфильтрованные данные о датчиках
    return NextResponse.json(filteredData);
  } catch (error) {
    console.error("Error reading data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// Функция для обработки POST запроса
export async function POST(req: Request) {
  try {
    // Чтение данных из тела запроса
    const form = await req.json();

    // Извлекаем id, ip и температуру
    const { id, ip, temp } = form;
    if (!id || !ip || !temp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let data: Record<string, SensorData> = {};

    // Чтение текущих данных
    try {
      const raw = await fs.promises.readFile(filePath, "utf-8");
      data = JSON.parse(raw);
    } catch (e) {
      // Если файл не существует, инициализируем с пустым объектом
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn("File not found, starting with an empty object.");
        data = {}; // Если файл не найден, начинаем с пустого объекта
      } else {
        console.error("Error reading file:", e);
        return NextResponse.json({ error: "Error reading file" }, { status: 500 });
      }
    }

    // Добавляем или обновляем данные для указанного устройства
    data[id] = {
      timestamp: Date.now(),
      ip,
      temp, // Сохраняем температуру
    };

    // Записываем обновленные данные в файл
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({ status: "ok", savedAs: id, ip, temp });
  } catch (error) {
    console.error("Error in POST request:", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}
