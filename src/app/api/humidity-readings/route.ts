import { NextResponse } from "next/server";
import { createHumidityService } from "@/services/humidity.service";
import { ReadingFilters } from "@/types/humidity";
import moment from "moment";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: ReadingFilters = {};

    const startDate = searchParams.get("startDate");
    if (startDate) {
      filters.startDate = moment(startDate).toDate();
    }

    const service = createHumidityService();
    const readings = await service.getAggregatedReadings(filters);

    return NextResponse.json(readings);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
