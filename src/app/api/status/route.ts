import { NextRequest, NextResponse } from "next/server";
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

// Внутренняя переменная для последнего обновления сервера
let lastUpdate: number = 0;

// Функция для обработки GET запроса
export async function GET() {
  try {
    const now = Date.now();
    const online = now - lastUpdate < 15000;

    // Чтение данных из файла с использованием асинхронных операций
    const rawData = await fs.promises.readFile(filePath, "utf-8");
    const data: Record<string, SensorData> = JSON.parse(rawData);

    // Фильтруем только те записи, которые начинаются с "28-" (датчики температуры)
    const filteredData = Object.keys(data)
      .filter((key) => key.startsWith("28-"))
      .reduce((obj: Record<string, SensorData>, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    // Возвращаем статус сервера + данные
    return NextResponse.json({
      status: online ? "online" : "offline",
      timestamp: lastUpdate,
      sensors: filteredData,
    });
  } catch (error) {
    console.error("Error reading data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// Функция для обработки POST запроса
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Если есть только timestamp — это запрос от сервера
    if (body.timestamp && !body.id) {
      lastUpdate = body.timestamp;
      return NextResponse.json({ status: "ok", timestamp: lastUpdate });
    }

    const { id, ip, temp } = body;
    if (!id || !ip || !temp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let data: Record<string, SensorData> = {};

    try {
      const raw = await fs.promises.readFile(filePath, "utf-8");
      data = JSON.parse(raw);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn("File not found, starting with an empty object.");
        data = {};
      } else {
        console.error("Error reading file:", e);
        return NextResponse.json({ error: "Error reading file" }, { status: 500 });
      }
    }

    data[id] = {
      timestamp: Date.now(),
      ip,
      temp,
    };

    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

    return NextResponse.json({ status: "ok", savedAs: id, ip, temp });
  } catch (error) {
    console.error("Error in POST request:", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}
