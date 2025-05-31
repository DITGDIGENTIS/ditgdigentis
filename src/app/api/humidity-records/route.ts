import { NextRequest, NextResponse } from "next/server";
import { createHumidityService } from "@/services/humidity.service";
import * as _ from "lodash";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const service = createHumidityService();

    if (body.startDate && body.endDate) {
      const readings = await service.getAggregatedReadings({
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        sensorIds: body.sensorIds,
      });

      return NextResponse.json(readings);
    }

    const data = _.isArray(body) ? body : [body];
    await service.createRecords(data);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/humidity-records] Ошибка:", {
      message: error?.message || "Unknown error",
      stack: error?.stack,
      name: error?.name,
      details: error?.details || "No additional details",
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sensorId = searchParams.get("sensorId");

    if (!sensorId) {
      return NextResponse.json(
        { error: "Sensor ID is required" },
        { status: 400 }
      );
    }

    const service = createHumidityService();
    const deletedCount = await service.deleteSensorRecords(sensorId);

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("[DELETE /api/humidity-records] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
