// src/app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === "12345") {
    const response = NextResponse.redirect(new URL("/furniset", request.url));
    response.cookies.set("auth", "true", {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 день
    });
    return response;
  }

  return new NextResponse("Unauthorized", { status: 401 });
}
