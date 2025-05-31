import { NextResponse } from "next/server";
import { createSensorService } from "@/services/sensor.service";
import moment from "moment";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: any = {};

    const startDate = searchParams.get("startDate");
    if (startDate) {
      filters.startDate = moment(startDate).toDate();
    }

    const service = createSensorService();
    const readings = await service.getAggregatedReadings(filters);

    return NextResponse.json(readings);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
