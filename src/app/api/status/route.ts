import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const filePath = path.resolve("/tmp/status.json");

type DeviceStatus = {
  ip: string;
  timestamp: number;
};

type StatusMap = {
  [key: string]: DeviceStatus;
};

export async function POST(req: Request) {
  const form = await req.formData();
  const id = form.get("id")?.toString();
  const ip = form.get("ip")?.toString() ?? "none";
  const timestamp = Date.now();

  let data: StatusMap = {};
  try {
    const raw = await readFile(filePath, "utf8");
    data = JSON.parse(raw);
  } catch {
    // файл ещё не существует — начинаем с пустого объекта
    data = {};
  }

  if (id) {
    data[id] = { ip, timestamp };
  }

  await writeFile(filePath, JSON.stringify(data), "utf8");
  return NextResponse.json({ status: "ok", savedAs: id ?? "unknown" });
}

export async function GET() {
  try {
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({});
  }
}
