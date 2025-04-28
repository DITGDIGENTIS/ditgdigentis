import { NextRequest, NextResponse } from "next/server";
import { findProtectedRouteByPageType } from "@/config/routes";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginType } = body;

    const protectedRoute = findProtectedRouteByPageType(loginType);

    if (!protectedRoute?.authConfig) {
      return NextResponse.json(
        { error: "Invalid login type" },
        { status: 400 }
      );
    }

    const { cookieName, cookieOptions } = protectedRoute.authConfig;
    const response = NextResponse.json({ success: true });

    response.cookies.set(cookieName, "", {
      ...cookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
