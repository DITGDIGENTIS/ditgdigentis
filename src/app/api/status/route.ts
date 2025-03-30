import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const filePath = path.resolve("/tmp/status.json");

type StatusMap = {
  [id: string]: {
    ip: string;
    timestamp: number;
  };
};

export async function POST(req: Request) {
  const form = await req.formData();
  const id = form.get("id")?.toString(); // может быть undefined
  const ip = form.get("ip")?.toString() ?? "none";
  const timestamp = Date.now();

  let data: StatusMap = {};
  try {
    const raw = await readFile(filePath, "utf8");
    data = JSON.parse(raw);
  } catch {
    data = {};
  }

  if (id) {
    // если пришло id (например zona1), сохранить в data[id]
    data[id] = { ip, timestamp };
  } else {
    // если без id — сохранить как "server"
    data["server"] = { ip, timestamp };
  }

  await writeFile(filePath, JSON.stringify(data), "utf8");

  return NextResponse.json({ status: "ok", savedAs: id ?? "server" });
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
