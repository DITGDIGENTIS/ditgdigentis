// pages/api/status.js

// Хранение статусов по зонам
const statusMap = {};

export default function handler(req, res) {
  // Обработка POST-запроса (получаем данные от Raspberry Pi)
  if (req.method === "POST") {
    const { id, ip, temp } = req.body;

    // Проверка на наличие данных
    if (!id || !ip || !temp) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Сохраняем данные в statusMap
    statusMap[id] = {
      timestamp: Date.now(),
      ip,
      temp, // Сохраняем температуру
    };

    // Логируем для отладки
    console.log(`Received data from ${id}: ${temp} °C`);

    return res.status(200).json({ ok: true, id, ip, temp });
  }

  // Обработка GET-запроса (получаем все данные для фронтенда)
  if (req.method === "GET") {
    return res.status(200).json(statusMap);
  }

  // Для других методов возвращаем ошибку
  res.status(405).end();
}
