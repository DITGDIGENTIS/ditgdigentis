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
    const id = form.get("id")?.toString() || "unknown"; // ID устройства, например, zona1 или zonaTemperature
    const ip = form.get("ip")?.toString() || "none";  // IP устройства
    const tempRaw = form.get("temp")?.toString(); // Температура в строковом формате
    const temp = tempRaw && tempRaw !== "undefined" ? tempRaw : undefined;  // Сохраняем температуру, если она есть
    const timestamp = Date.now(); // Время отправки данных
    
    // Логируем получение данных для дебага
    console.log("Received data:", { id, ip, temp });

    let data: StatusMap = {};
    
    // Попробуем прочитать и распарсить данные из файла
    try {
      const raw = await readFile(filePath, "utf8");
      data = JSON.parse(raw);
    } catch (e) {
      // Обработка ошибки чтения файла (например, если файл не существует)
      if (e instanceof Error) {
        // Проверяем тип ошибки
        if (e.message.includes("ENOENT")) {
          console.warn("File not found, starting with an empty object.");
        } else {
          console.error("Error reading file:", e.message);
        }
      }
      data = {}; // Если файла нет или он пустой, начинаем с пустого объекта
    }

    // Проверка на корректность данных (например, на числовую температуру)
    if (temp && isNaN(Number(temp))) {
      return NextResponse.json({ status: "error", message: "Invalid temperature format" }, { status: 400 });
    }

    // Добавляем или обновляем данные для указанного устройства
    data[id] = {
      ip,
      timestamp,
      ...(temp ? { temp } : {}), // Сохраняем температуру, если она есть
    };

    // Записываем обновленные данные в файл
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");

    // Возвращаем успешный ответ с информацией о сохранённых данных
    return NextResponse.json({
      status: "ok",
      savedAs: id,
      ip,
      temp, // Включаем температуру в ответ для дебага
    });
  } catch (error) {
    console.error("Error in POST request:", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}

// Функция обработки GET запроса для получения данных
export async function GET() {
  try {
    // Попробуем прочитать и распарсить данные из файла
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw);

    // Проверка на существование данных
    if (typeof json !== "object" || json === null) {
      return NextResponse.json({}, { status: 400 });
    }

    // Фильтруем только данные о датчиках, которые начинаются на "28-" (датчики температуры)
    const filteredData = Object.keys(json)
      .filter(key => key.startsWith("28-")) // Фильтруем по ID, начинающимся на "28-" (датчики)
      .reduce((obj, key) => {
        const device = json[key];
        // Убедимся, что устройство существует и имеет валидную структуру
        if (device && typeof device === "object") {
          obj[key] = device;
        }
        return obj;
      }, {} as StatusMap); // Инициализируем объект как StatusMap

    console.log("Returned sensor data:", filteredData);
    return NextResponse.json(filteredData);
  } catch (error) {
    console.error("Error in GET request:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
    
