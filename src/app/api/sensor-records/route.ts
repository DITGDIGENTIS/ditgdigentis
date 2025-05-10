import { NextResponse } from "next/server";
import { createSensorService } from "../../../services/sensor.service";
import {
  createSensorData,
  SensorDataBatch,
  validateBatch,
  validateSensorData
} from "../../../services/sensor-data.service";

type ApiError = {
  name?: string;
  message: string;
  stack?: string;
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.clone().text();
    console.log("Received request body:", rawBody);

    const body = JSON.parse(rawBody) as SensorDataBatch;
    console.log("Parsed body:", body);

    // Проверяем структуру данных
    if (!body || typeof body !== 'object') {
      throw new Error("Invalid request body: must be an object");
    }

    if (!Array.isArray(body.sensors)) {
      throw new Error("Invalid request body: sensors must be an array");
    }

    if (body.sensors.length === 0) {
      throw new Error("Invalid request body: sensors array cannot be empty");
    }

    // Проверяем каждый сенсор
    body.sensors.forEach((sensor, index) => {
      console.log(`Validating sensor ${index}:`, sensor);
      if (!validateSensorData(sensor)) {
        throw new Error(`Invalid sensor data at index ${index}: ${JSON.stringify(sensor)}`);
      }
    });

    // Проверяем весь пакет
    if (!validateBatch(body)) {
      throw new Error("Invalid sensor batch format");
    }

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
