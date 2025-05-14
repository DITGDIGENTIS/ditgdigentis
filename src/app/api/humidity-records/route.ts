import { NextRequest, NextResponse } from "next/server";
import { createHumidityService, HumidityDataPoint } from "@/services/humidity.service";
import _ from "lodash";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = _.isArray(body) ? body : [body];

    if (!_.every(data, (item): item is HumidityDataPoint => {
      return _.isString(item.sensor_id) && 
             _.isNumber(item.humidity) && 
             _.isNumber(item.temperature) &&
             item.humidity >= 0 && 
             item.humidity <= 100;
    })) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    const service = createHumidityService();
    await service.createRecords(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/humidity-records] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const service = createHumidityService();
    const readings = await service.getAllReadings();
    return NextResponse.json(readings);
  } catch (error) {
    console.error("[GET /api/humidity-records] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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