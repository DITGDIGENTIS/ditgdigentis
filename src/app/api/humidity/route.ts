const PI_HUMIDITY_URL = "https://furniset.tail68d252.ts.net:8787/humidity.json";

export async function GET() {
  try {
    const res = await fetch(PI_HUMIDITY_URL, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Ошибка запроса к Raspberry Pi: ${res.status}`);
    }

    const data = await res.json();

    // Фильтрация только по ключам HUM1-
    const filteredSensors = Object.fromEntries(
      Object.entries(data.sensors || {}).filter(([key]) =>
        key.startsWith("HUM1-")
      )
    );

    return Response.json({
      sensors: filteredSensors,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error("Ошибка получения данных с Pi:", error);
    return Response.json(
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
  return Response.json({ error: "Saving запрещено на Vercel" }, { status: 405 });
}

