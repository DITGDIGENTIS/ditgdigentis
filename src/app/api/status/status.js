import fs from "fs";
import path from "path";

const filePath = path.resolve("/home/ditg-z1/sensor_zones.json");

export async function GET(req, res) {
  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(rawData);

    const filteredData = Object.keys(data)
      .filter((key) => key.startsWith("SENSOR1-")) // <-- Только температурные
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("Ошибка чтения:", error);
    return res.status(500).json({ error: "Failed to fetch data" });
  }
}

export async function POST(req, res) {
  try {
    const body = await req.json();
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
    return res.status(200).json({ status: "ok", received: Object.keys(body).length });
  } catch (err) {
    console.error("Ошибка записи:", err);
    return res.status(500).json({ error: "Failed to save data" });
  }
}
