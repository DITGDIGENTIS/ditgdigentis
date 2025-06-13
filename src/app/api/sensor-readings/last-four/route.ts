import { NextResponse } from "next/server";
import { createSensorService } from "@/services/sensor.service";
import * as _ from "lodash";
import { DateTime } from "luxon";

const REQUIRED_SENSORS = ["SENSOR1-1", "SENSOR1-2", "SENSOR1-3", "SENSOR1-4"];

export async function GET(request: Request) {
  try {
    const service = createSensorService();
    const readings = await service.getLastFourReadings();

    const groupedReadings = _.chain(readings)
      .groupBy("sensor_id")
      .mapValues((sensorReadings) => _.maxBy(sensorReadings, "timestamp"))
      .value();

    const timestamps = _.chain(groupedReadings)
      .map((reading) =>
        reading ? DateTime.fromJSDate(reading.timestamp).toMillis() : 0
      )
      .value();

    const latestTimestamp = _.max(timestamps) || DateTime.now().toMillis();

    const result = _.chain(REQUIRED_SENSORS)
      .map((sensorId) => {
        const reading = groupedReadings[sensorId];
        if (!reading) return null;
        
        return {
          sensor_id: sensorId,
          temperature: reading.temperature,
          timestamp: DateTime.fromMillis(latestTimestamp).toISO(),
        };
      })
      .compact()
      .value();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching last four readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch last four readings" },
      { status: 500 }
    );
  }
}
