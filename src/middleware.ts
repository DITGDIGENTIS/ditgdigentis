import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const isAuth = request.cookies.get("auth")?.value === "true";
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/furniset");
  
  console.log("Middleware - isAuth:", isAuth);
  console.log("Middleware - isProtectedRoute:", isProtectedRoute);
  console.log("Middleware - pathname:", request.nextUrl.pathname);
  console.log("Middleware - cookies:", request.cookies.getAll());

  if (!isAuth && isProtectedRoute) {
    console.log("Middleware - redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  console.log("Middleware - allowing request");
  return NextResponse.next();
}

export const config = {
  matcher: ["/furniset/:path*"]
}; 