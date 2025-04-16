// pages/api/status.js
import fs from "fs";
import path from "path";

// Путь к файлу, где будут храниться данные
const filePath = path.resolve("/home/ditg-z1/sensor_zones.json");

export async function GET(req, res) {
  try {
    // Чтение данных из файла
    const rawData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(rawData);

    // Логирование полученных данных
    console.log("Returning sensor data:", data);

    // Фильтрация только датчиков с ID, начинающимися на "28-" (для температурных датчиков)
    const filteredData = Object.keys(data)
      .filter(key => key.startsWith("zona1")) // Или используйте другое условие фильтрации
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    // Возвращаем только отфильтрованные данные
    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("Error reading data:", error);
    return res.status(500).json({ error: "Failed to fetch data" });
  }
}
