import { NextRequest, NextResponse } from "next/server";
import { createHumidityService } from "@/services/humidity.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { company_name: string } }
) {
  try {
    const company_name = params.company_name;

    console.log("API Request params:", {
      company_name,
    });

    const service = createHumidityService();
    const readings = await service.getLastOneHumidityReadings(company_name);
    console.log("Found readings:", readings.length);

    return NextResponse.json(readings);
  } catch (error) {
    console.error("Error fetching humidity readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch humidity readings" },
      { status: 500 }
    );
  }
}
