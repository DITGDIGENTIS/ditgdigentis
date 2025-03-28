import { NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import path from "path";

const filePath = path.resolve("/tmp/status.json");

export async function POST(req: Request) {
  const data = await req.formData();
  const ip = data.get("ip")?.toString() ?? "none";
  const timestamp = Date.now();

  await writeFile(filePath, JSON.stringify({ ip, timestamp }), "utf8");
  return NextResponse.json({ status: "ok" });
}

export async function GET() {
  try {
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ ip: null, timestamp: null });
  }
}
