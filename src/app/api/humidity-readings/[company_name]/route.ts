import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { createHumidityService } from "@/services/humidity.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { company_name: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const company_name = params.company_name;

    const startDateTime = startDate
      ? DateTime.fromFormat(startDate, "yyyy-MM-dd", { zone: "UTC" })
      : undefined;
    const endDateTime = endDate
      ? DateTime.fromFormat(endDate, "yyyy-MM-dd", { zone: "UTC" })
      : undefined;

    const filters = {
      startDate: startDateTime?.startOf("day").toJSDate(),
      endDate: endDateTime?.endOf("day").toJSDate(),
      company_name,
    };

    const service = createHumidityService();
    const readings = await service.getAggregatedHumidityReadings(filters);

    return NextResponse.json(readings);
  } catch (error) {
    console.error("Error fetching sensor readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch sensor readings" },
      { status: 500 }
    );
  }
}
