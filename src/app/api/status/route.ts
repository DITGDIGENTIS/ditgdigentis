// app/api/status/route.ts

import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const filePath = path.resolve("/tmp/status.json");

type DeviceStatus = {
  ip: string;
  timestamp: number;
  temp?: string;
};

type StatusMap = {
  [key: string]: DeviceStatus;
};

export async function POST(req: Request) {
  const form = await req.formData();
  const id = form.get("id")?.toString() || "unknown";
  const ip = form.get("ip")?.toString() || "none";
  const tempRaw = form.get("temp")?.toString();
  const temp = tempRaw && tempRaw !== "undefined" ? tempRaw : undefined;
  const timestamp = Date.now();

  let data: StatusMap = {};
  try {
    const raw = await readFile(filePath, "utf8");
    data = JSON.parse(raw);
  } catch {
    data = {};
  }

  data[id] = {
    ip,
    timestamp,
    ...(temp ? { temp } : {}) // 💡 зберігаємо тільки дійсне значення
  };

  await writeFile(filePath, JSON.stringify(data), "utf8");

  return NextResponse.json({
    status: "ok",
    savedAs: id,
    ip,
    temp, // 🔎 додаємо у відповідь — корисно для дебагу
  });
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
