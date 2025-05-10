import { NextResponse } from "next/server";
import { cleanupService } from "../../../services/cleanup.service";

export async function GET() {
  try {
    await cleanupService.startCleanupService();
    return NextResponse.json({ message: "Cleanup service started successfully" });
  } catch (error) {
    console.error("Error starting cleanup service:", error);
    return NextResponse.json(
      { error: "Failed to start cleanup service" },
      { status: 500 }
    );
  }
} 