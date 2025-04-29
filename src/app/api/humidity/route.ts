import { NextResponse } from "next/server";

const PI_HUMIDITY_URL = "https://furniset.tail68d252.ts.net:8787/humidity.json";

export async function GET() {
  try {
    const res = await fetch(PI_HUMIDITY_URL, { cache: "no-store" });

    if (!res.ok) {
      console.error(`Ошибка запроса к Raspberry Pi: ${res.status}`);
      return NextResponse.json(
        {
          sensors: {},
          serverTime: Date.now(),
          error: `Ошибка подключения к Raspberry Pi: ${res.status}`,
        },
        { status: 500 }
      );
    }

    const data = await res.json();

    const filteredSensors = Object.fromEntries(
      Object.entries(data.sensors || {}).filter(([key]) =>
        key.startsWith("HUM1-")
      )
    );

    return NextResponse.json({
      sensors: filteredSensors,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error("Ошибка получения данных с Pi:", error);
    return NextResponse.json(
      {
        sensors: {},
        serverTime: Date.now(),
        error: "Ошибка подключения к Raspberry Pi",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Saving запрещено на Vercel" },
    { status: 405 }
  );
}
