import fs from "fs";
import path from "path";

// Путь к файлу для хранения данных
const filePath = path.resolve("status.json");

// Функция для чтения и записи данных в файл
const readData = () => {
  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(rawData);
  } catch (err) {
    if (err.code === "ENOENT") {
      // Если файл не существует, возвращаем пустой объект
      return {};
    }
    throw err;
  }
};

const writeData = (data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
};

// Хранение статусов по зонам
export default function handler(req, res) {
  // Обработка POST-запроса (получаем данные от Raspberry Pi)
  if (req.method === "POST") {
    const { id, ip, temp } = req.body;

    // Проверка на наличие данных
    if (!id || !ip || !temp) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Чтение текущих данных
    const statusMap = readData();

    // Сохраняем данные в statusMap
    statusMap[id] = {
      timestamp: Date.now(),
      ip,
      temp, // Сохраняем температуру
    };

    // Логируем для отладки
    console.log(`Received data from ${id}: ${temp} °C`);

    // Записываем обновленные данные в файл
    writeData(statusMap);

    return res.status(200).json({ ok: true, id, ip, temp });
  }

  // Обработка GET-запроса (получаем все данные для фронтенда)
  if (req.method === "GET") {
    const statusMap = readData();
    return res.status(200).json(statusMap);
  }

  // Для других методов возвращаем ошибку
  res.status(405).end();
}
