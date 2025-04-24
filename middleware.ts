import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  console.log("🔥 MIDDLEWARE", req.nextUrl.pathname);

  const isProtected = req.nextUrl.pathname.startsWith("/furniset");
  const isLoggedIn = req.cookies.get("auth")?.value === "true";

  if (isProtected && !isLoggedIn) {
    console.log("🔒 REDIRECT /login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/furniset", "/furniset/:path*"],
};
