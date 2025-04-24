// src/app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  // Перезаписываем куку так, чтобы браузер её стёр
  response.cookies.set("auth", "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
