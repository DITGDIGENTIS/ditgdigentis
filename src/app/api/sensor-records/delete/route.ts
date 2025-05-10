import { NextResponse } from "next/server";
import { createSensorService } from "../../../../services/sensor.service";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sensorId = searchParams.get("sensorId");

    if (!sensorId) {
      return NextResponse.json(
        { error: "Sensor ID is required" },
        { status: 400 }
      );
    }

    const sensorService = createSensorService();
    const deletedCount = await sensorService.deleteSensorRecords(sensorId);

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} records for sensor ${sensorId}`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error deleting sensor records:", error);
    return NextResponse.json(
      { error: "Failed to delete sensor records" },
      { status: 500 }
    );
  }
} 