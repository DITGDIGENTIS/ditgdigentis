import { NextResponse } from "next/server";
import { createSensorService } from "@/services/sensor.service";

export async function GET() {
  try {
    console.log("API: Starting to fetch sensor readings");
    const sensorService = createSensorService();
    console.log("API: Sensor service created");
    
    const readings = await sensorService.getAllReadings();
    console.log("API: Readings fetched:", readings);
    
    if (!readings || readings.length === 0) {
      console.log("API: No readings found");
      return NextResponse.json([]);
    }
    
    return NextResponse.json(readings);
  } catch (error) {
    console.error("API: Error fetching sensor readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch sensor readings" },
      { status: 500 }
    );
  }
} 