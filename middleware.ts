// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const isAuth = request.cookies.get("auth")?.value === "true";
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/furniset");

  if (!isAuth && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/furniset/:path*", "/furniset"],
};
