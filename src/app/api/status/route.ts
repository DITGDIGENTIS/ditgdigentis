import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const filePath = path.resolve("/tmp/status.json");

type DeviceStatus = {
  ip: string;
  timestamp: number;
};

type StatusMap = {
  ip: string;
  timestamp: number;
  [key: string]: string | number | DeviceStatus;
};

export async function POST(req: Request) {
  const form = await req.formData();
  const id = form.get("id")?.toString(); // zona1, zona2 или undefined
  const ip = form.get("ip")?.toString() ?? "none";
  const timestamp = Date.now();

  let data: StatusMap;
  try {
    const raw = await readFile(filePath, "utf8");
    data = JSON.parse(raw);
  } catch {
    // если файла ещё нет
    data = {
      ip,
      timestamp,
    };
  }

  // 1. сохраняем старый формат (в корне)
  data.ip = ip;
  data.timestamp = timestamp;

  // 2. сохраняем в зону, если указана
  if (id) {
    data[id] = { ip, timestamp };
  }

  await writeFile(filePath, JSON.stringify(data), "utf8");
  return NextResponse.json({ status: "ok", savedAs: id ?? "legacy" });
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
