import { NextResponse } from "next/server";
import { createSensorService } from "../../../services/sensor.service";
import {
  createSensorData,
  SensorDataBatch,
} from "../../../services/sensor-data.service";

type ApiError = {
  name?: string;
  message: string;
  stack?: string;
};

export async function POST(req: Request) {
  try {
    console.log("Received request body:", await req.clone().text());

    const body = (await req.json()) as SensorDataBatch;
    console.log("Parsed body:", body);

    const processedData = createSensorData(body);
    console.log("Processed data:", processedData);

    const sensorService = createSensorService();
    await sensorService.createRecords(processedData);

    return NextResponse.json({
      success: true,
      processed: processedData.length,
    });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error("Detailed error in API route:", {
      name: apiError?.name,
      message: apiError?.message,
      stack: apiError?.stack,
    });

    return NextResponse.json(
      {
        error: "Failed to process sensor data",
        details: apiError?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sensorService = createSensorService();
    const readings = await sensorService.getAllReadings();

    return NextResponse.json({ readings });
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.error("Error in GET route:", {
      name: apiError?.name,
      message: apiError?.message,
      stack: apiError?.stack,
    });

    return NextResponse.json(
      {
        error: "Failed to get readings",
        details: apiError?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
