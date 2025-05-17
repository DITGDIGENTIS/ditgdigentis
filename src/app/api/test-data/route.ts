import { NextResponse } from "next/server";
import { createHumidityService } from "@/services/humidity.service";

const SENSOR_IDS = ['HUM1-1', 'HUM1-2'];

export async function POST() {
  try {
    const service = createHumidityService();
    const now = new Date();
    const testData = [];

    // Generate 24 hours of data with 5-minute intervals
    for (let i = 0; i < 24 * 12; i++) {
      const timestamp = new Date(now.getTime() - (24 * 60 * 60 * 1000) + (i * 5 * 60 * 1000));
      
      for (const sensorId of SENSOR_IDS) {
        const timeProgress = i / (24 * 12);
        const sinValue = Math.sin(timeProgress * Math.PI * 4);
        
        testData.push({
          sensor_id: sensorId,
          timestamp,
          temperature: 25 + sinValue * 5 + (Math.random() * 2 - 1),
          humidity: 50 + Math.cos(timeProgress * Math.PI * 3) * 20 + (Math.random() * 4 - 2)
        });
      }
    }

    // Add current data
    for (const sensorId of SENSOR_IDS) {
      testData.push({
        sensor_id: sensorId,
        timestamp: now,
        temperature: 25 + (Math.random() * 2 - 1),
        humidity: 50 + (Math.random() * 4 - 2)
      });
    }

    await service.createRecords(testData);

    return NextResponse.json({ 
      success: true, 
      count: testData.length 
    });
  } catch (error) {
    console.error("[POST /api/test-data] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 